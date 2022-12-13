# youtubeee: Youtube Upload Helper
`youtubeee` upload video files in specifed directory, including subdirectories.

## Prerequisite
- `python>=3.10` (develop machine environment)
- install `pipenv`
- tested on macos (move file to trash)

## How to use
- create virtual environment using pipenv.
- `pipenv install`
- locate `todo.json` in working directory.
```jsonc
[
    {
        "file_path" : "full path of directory that contains video files",
        "to": [ 
            {
                "client_secret" : "full path of oauth client secret file",
                "youtube_playlist_id" : "(optional) play list id to be add"
            },
            // ...
        ]
    },
    //...
]
```
- sample usage
```python 
tube = youtubeee()
if not tube.init():
    print('error or nothing to do')
    exit(1)
tube.run_todos()
```