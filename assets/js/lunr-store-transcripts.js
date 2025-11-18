---
# create lunr store with transcript content for enhanced search
---
{%- assign items = site.data[site.metadata] | where_exp: 'item','item.objectid and item.parentid == nil' -%}
{%- assign fields = site.data.config-search -%}
var store = [
{%- for item in items -%}
{
{% for f in fields %}{% if item[f.field] %}{{ f.field | jsonify }}: {{ item[f.field] | normalize_whitespace | replace: '""','"' | jsonify }},{% endif %}{% endfor %}
"id": {{item.objectid | append: '.html' | jsonify }},
"type": "metadata"
}
{%- comment -%} Add transcript segments if this is a transcript item {%- endcomment -%}
{%- if item.display_template == 'transcript' -%}
{%- if item['object-transcript'] contains '.csv' -%}
{%- assign transcript_name = item['object-transcript'] | remove: '.csv' -%}
{%- elsif item['object-transcript'] -%}
{%- assign transcript_name = item['object-transcript'] -%}
{%- else -%}
{%- assign transcript_name = item.objectid -%}
{%- endif -%}
{%- assign transcript_data = site.data.transcripts[transcript_name] -%}
{%- if transcript_data -%}
{%- for segment in transcript_data -%}
{%- if segment.words and segment.words != '' -%}
,{
"title": {{ item.title | jsonify }},
"interviewee": {{ item.interviewee | jsonify }},
"date": {{ item.date | jsonify }},
"speaker": {{ segment.speaker | jsonify }},
"timestamp": {{ segment.timestamp | jsonify }},
"words": {{ segment.words | normalize_whitespace | jsonify }},
"tags": {{ segment.tags | jsonify }},
"id": {{ item.objectid | append: '.html#segment-' | append: forloop.index0 | jsonify }},
"parentId": {{ item.objectid | jsonify }},
"type": "transcript",
"segmentIndex": {{ forloop.index0 }}
}
{%- endif -%}
{%- endfor -%}
{%- endif -%}
{%- endif -%}
{%- unless forloop.last -%},{%- endunless -%}
{%- endfor -%}
];
