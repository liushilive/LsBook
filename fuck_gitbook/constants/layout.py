from string import Template

layout = Template("""
<!DOCTYPE HTML>
<html lang="{{ config.language }}" {% if page.dir == "rtl" %}dir="rtl"{% endif %}>
    <head>
        <meta charset="UTF-8">
        <meta content="text/html; charset=utf-8" http-equiv="Content-Type">
        <title>{% block title %}{{ config.title|d("GitBook", true) }}{% endblock %}</title>
        <meta http-equiv="X-UA-Compatible" content="IE=edge" />
        <meta name="description" content="{% block description %}{% endblock %}">
        <meta name="generator" content="GitBook {{ gitbook.version }}">
        {% if config.author %}<meta name="author" content="{{ config.author }}">{% endif %}
        {% if config.isbn %}<meta name="identifier" content="{{ config.isbn }}" scheme="ISBN">{% endif %}
        {% block style %}
            {% for resource in plugins.resources.css %}
                {% if resource.url %}
                <link rel="stylesheet" href="{{ resource.url }}">
                {% else %}
                <link rel="stylesheet" href="{{ resource.path|resolveAsset }}">
                {% endif %}
            {% endfor %}
        {% endblock %}
        {% block head %}{% endblock %}
    </head>
    <body>
        {% block body %}{% endblock %}
        {% block javascript %}{% endblock %}
    </body>
</html>
""")
