# Confluence Docs as Code Action

This Action publishes your [MkDocs](https://www.mkdocs.org) documentation to your
Atlassian Confluence Cloud wiki.

## Features

* Publishes only new or changed pages
* Converts internal links to Confluence links
* Uploads images as Confluence page attachments
* Converts fenced code blocks to Confluence code macros
* Renders *Mermaid* & *PlantUML* graphs to images (via [Kroki.io](https://kroki.io))
* Restricts page update to [confluence_user](#confluence_user)

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

### `kroki_enabled`

*Optional*. When set to `yes` enables rendering of [Mermaid](https://mermaid.js.org/)
and [PlantUML](https://plantuml.com/) graphs into images (`.png`)
via [Kroki.io](https://kroki.io/) service.

Defaults to `yes`.

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

jobs:
  publish-to-confluence:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Source
        uses: actions/checkout@v3
      - name: Publish to Confluence
        uses: Workable/confluence-docs-as-code@v1.0
        with:
          confluence_tenant: 'Your Confluence Account Name'
          confluence_space: 'The Confluence Space Key'
          confluence_user: ${{ secrets.CONFLUENCE_USER }}
          confluence_token: ${{ secrets.CONFLUENCE_TOKEN }}
          confluence_parent_page: 'The title of the page to use as parent' # Optional
          kroki_enabled: 'yes' # Optional
```
