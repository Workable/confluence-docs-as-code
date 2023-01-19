# Markdown

A *file* with **Markdown** content.

## With code blocks

```js
let a = 'a string value';

for (let char of a) {
    console.log(char);
}
```

```sql
SELECT * FROM table;
```

```
No language in this block
```

```sh
```

## With images

### Local

![img1](../images/img-1.png)

### Remote

![Wikipedia Logo](https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Wikipedia-logo-v2.svg/2880px-Wikipedia-logo-v2.svg.png)

### No content

![](https://upload.wikimedia.org/wikipedia/en/thumb/8/80/Wikipedia-logo-v2.svg/2880px-Wikipedia-logo-v2.svg.png)

### Unsafe path traversal

![unsafe](../../../../../../../etc/passwd)

## With Mermaid graph

```mermaid
graph TD
    A[Christmas] -->|Get money| B(Go shopping)
    B --> C{Let me think}
    C -->|One| D[Laptop]
    C -->|Two| E[iPhone]
    C -->|Three| F[Car]
```

## With PlantUML graph

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle
skinparam monochrome true
actor customer
actor clerk
rectangle checkout {
  customer -- (checkout)
  (checkout) .> (payment) : include
  (help) .> (checkout) : extends
  (checkout) -- clerk
}
@enduml
```

## External Link

[Google](https://google.com)

## Internal Link

[Other Page](other-page.md)
