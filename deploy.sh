#!/bin/sh
poetry update
poetry run pyinstaller -F src/youtubeee.py -n Youtubeee --paths ./src --paths ./src/v3