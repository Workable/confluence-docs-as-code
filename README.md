# Confluence Docs as Code Action

This Action publishes your [MkDocs](https://www.mkdocs.org) documentation to your
Atlassian Confluence Cloud wiki.

## Features

* Publishes only new or changed pages
  * Optionally [force update](#confluence_force_update) all pages
  * Force update all pages on new major/minor release
* Converts internal links to Confluence links
* Uploads images as Confluence page attachments
* Converts fenced code blocks to Confluence code macros
* Renders graphs:
  * *Mermaid* see [`mermaid_renderer`](#mermaid_renderer) for available options
  * *PlantUML* see [`plantuml_renderer`](#plantuml_renderer) for available options
* Add a common [prefix](#confluence_title_prefix) to all page titles
* Restricts page update to [confluence_user](#confluence_user)
* Supports nested navigation in the `nav` section of the [MkDocs Configuration](#mkdocs-configuration)

## Limitations

* Does not publish pages not described in the `nav` section.

## Requirements

In order to use this action to your repository you need to meet the following requirements.

### MkDocs Configuration

Your repository is expected to include an `mkdocs.yml` configuration file
(in the root dir) with the following settings:

* `site_name`
* `repo_url`
* `nav`

```yml
site_name: Fixture Site Name
repo_url: https://github.com/fixture-account/fixture-repo

nav:
  - Page title: page.md
  - Some other page title: other-page.md
  - Yet an other page title: more/page.md
```

For more MkDocs configuration options check out the official [documentation](https://www.mkdocs.org/user-guide/configuration).

### Atlassian Confluence

In order for the action to be able to publish your documents to a Confluence space
you need to create an API token for a user with read/write access to that space.

It is highly recommended that you create a dedicated (robot) user just for this purpose.

Refer to Atlassian documentation on [managing API tokens](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).

## Inputs

### `confluence_tenant`

**Required**. Typically this is your is your organization name that is used as a subdomain to
your Atlassian cloud url, for example if your Atlassian url is
`https://my-organization.atlassian.net` use `my-organization` as
`confluence_tenant`

### `confluence_space`

**Required**. The key of the space that will host your documentation.
If your space has an auto-generated key, navigate to your space an you can find
it in the URL on your browser's location.

For example if your space URL is:
`https://my-organization.atlassian.net/wiki/spaces/~55700475998cb3f40a`

Use `~55700475998cb3f40a` as your `confluence_space`.

### `confluence_user`

**Required**. The username of the user that will be used to publish to Confluence
(see also [Atlassian Confluence](#atlassian-confluence) section)

### `confluence_token`

**Required**. The API token of the user that will be used to publish to Confluence
(see also [Atlassian Confluence](#atlassian-confluence) section)

### `confluence_parent_page`

*Optional*. The title of an existing page in the same Confluence space to be used as
a parent for your documentation.

For example if your space has a page with title **"My Documentation"** and you
want to use it as the parent for your published documents, then set
`confluence_parent_page` to `'My Documentation'`

### `confluence_title_prefix`

*Optional*. When set, this prefix will be prepended to all confluence page titles
except your root page which is titled according to the `site_name` in your
[MkDocs configuration](#mkdocs-configuration).

For example, if you have a page with title `'My Page'` and the `confluence_title_prefix`
is set to `'FOO:'` then the page will be created to confluence with the title
`'FOO: My Page'`.

This could be useful in cases that you want to publish multiple repos to the same
confluence space, which requires each page title to be unique.

### `confluence_force_update`

*Optional*. When set to `yes` all pages will be published to confluence including
those that have not changed. Can be handy when used with the `workflow_dispatch`
event as shown in the [example usage](#example-usage) below.

### `confluence_cleanup`

*Optional*. When set to `yes` all pages will be deleted from confluence.
Can be handy when used with the `workflow_dispatch` event as shown in the
[example usage](#example-usage) below.

### `kroki_enabled` (*Deprecated*)

*Optional*. When set to `yes` enables rendering of [Mermaid](https://mermaid.js.org/)
and [PlantUML](https://plantuml.com/) graphs into images (`.png`)
via [Kroki.io](https://kroki.io/) service.

Defaults to `yes`.

> ⚠️ Will be removed in future releases in favour of the more fine-grained
> [`mermaid_renderer`](#mermaid_renderer) and [`plantuml_renderer`](#plantuml_renderer)
> options below.

### `kroki_host` 

*Optional*. When set this host is used as a kroki server instead of the default one.
See [kroki docs](https://docs.kroki.io/kroki/setup/use-docker-or-podman/) on how to setup a local kroki instance.

Defaults to https://kroki.io

### `mermaid_renderer`

*Optional*. Can be one of:

* `'none'`: will not render
* `'kroki'`: will use [Kroki.io](https://kroki.io) to render as `png`
* `'mermaid-plugin'`: will upload the diagram source and render using
  [Mermaid Diagrams for Confluence](https://marketplace.atlassian.com/apps/1226567/mermaid-diagrams-for-confluence?tab=overview&hosting=cloud) add-on

> ⚠️ If not explicitly defined, falls back to [`kroki_enabled`](#kroki_enabled-deprecated)
> option in order to provide backwards compatibility

### `plantuml_renderer`

*Optional*. Can be one of:

* `'none'`: will not render
* `'kroki'`: will use [Kroki.io](https://kroki.io) to render as `png`
* `'plantuml'`: will use [plantuml.com](https://plantuml.com/) to render as `png`

> ⚠️ If not explicitly defined, falls back to [`kroki_enabled`](#kroki_enabled-deprecated)
> option in order to provide backwards compatibility

## Example usage

```yml
# File: .github/workflows/publish_to_confluence.yml

name: Publish MkDocs to Confluence

on:
  push:
    branches:
      - master
    paths:
      - "docs/**"
      - mkdocs.yml
  workflow_dispatch:
    inputs:
      confluence_force_update:
        description: 'Force update all pages (yes/no)?'
        required: false
        default: 'no'
      confluence_cleanup:
        description: 'Delete all pages (yes/no)?'
        required: false
        default: 'no'

jobs:
  publish-to-confluence:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source
        uses: actions/checkout@v3
      - name: Publish to Confluence
        uses: Workable/confluence-docs-as-code@v1.5.0
        with:
          confluence_tenant: 'Your Confluence Account Name'
          confluence_space: 'The Confluence Space Key'
          confluence_user: ${{ secrets.CONFLUENCE_USER }}
          confluence_token: ${{ secrets.CONFLUENCE_TOKEN }}
          confluence_parent_page: 'The title of the page to use as parent' # Optional
          confluence_title_prefix: 'My Prefix:' # Optional
          confluence_force_update: ${{ github.event.inputs.confluence_force_update }} # Optional
          confluence_cleanup: ${{ github.event.inputs.confluence_cleanup }} # Optional
          kroki_enabled: 'no' # Optional
          kroki_host: 'https://kroki.io' # Optional
          mermaid_renderer: 'none' # Optional
          plantuml_renderer: 'none' # Optional
```
