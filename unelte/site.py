"""Face index.html (pagina pentru GitHub Pages) din relieful-romaniei.html, care e scris fără <head>
(pentru Artifact). Rulare: python unelte/site.py"""
import os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
body = open(os.path.join(root, "relieful-romaniei.html"), encoding="utf-8").read()
head = ('<!doctype html>\n<html lang="ro">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        '<meta name="description" content="Aplicație de învățat relieful României: hartă, lecții, fotografii și jocuri pe harta oarbă.">\n'
        '<meta name="theme-color" content="#2f6b4f">\n'
        '<style>html{color-scheme:light dark}body{margin:0}img{max-width:100%}[hidden]{display:none!important}'
        ':root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>\n')
open(os.path.join(root, "index.html"), "w", encoding="utf-8").write(head + body + "\n</html>\n")
print("index.html scris")
