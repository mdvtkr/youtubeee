import types
import json
import os
import sys
import v3.uploader as api_uploader
from pathlib import Path
import argparse

__print = print
print = lambda x:__print(x, flush=True)

class Youtubeee:
    def __init__(self, working_dir='./'):
        self.__working_dir = working_dir
        self.__unavaliable_client = []
        self.__config = types.SimpleNamespace()
        self.__config.video_extensions = ['.mp4', '.mkv', '.webm']
    
    def init(self) -> bool:
        todo_path = os.path.join(self.__working_dir, 'config', 'youtubeee.todo.json')
        print('find todo file: ' + todo_path)
        if not os.path.exists(todo_path):
            print('todo.json does not exists.')
            return False

        f = open(todo_path, 'r')
        self.__todo = json.load(f)
        f.close()

        if len(self.__todo) == 0:
            print('todo list is empty.')
            return False

        return True

    def run_todos(self):
        for todo in self.__todo:
            root_path = todo['file_path']
            print('======================')
            print(root_path)
            print('======================')
            INDENT = '  '
            log_indent = INDENT
            # comes first if file name start with number
            # files ordered by timestamp come next
            def file_ordering_key(path:Path):
                name = path.stem
                timestamp = path.stat().st_mtime
                numbering = name.split('.')[0].split(' ')[0]
                if len(numbering) > 0 and str.isdigit(numbering):    # file name like ( '1.xxx' or '1 xxx' )
                    return (int(numbering), timestamp)
                else:
                    return (sys.maxsize, timestamp)

            def traverse_directories(path:Path, hierachy_names=[]):
                video_infos = []         # add sorted files per path
                cur_dir_videos = []      # current files found
                if not path.exists():
                    return video_infos
            
                # process folder first if exists
                for file in path.iterdir():
                    if file.is_dir():
                        print(log_indent + 'subdirectory searching in ' + str(file.absolute()))
                        hierachy_names.append(file.name)
                        video_infos.extend(traverse_directories(file, hierachy_names))     # recursive searching
                    elif file.suffix in self.__config.video_extensions:
                        cur_dir_videos.append( { 'path':file, 'hierarcy': hierachy_names })

                cur_dir_videos = sorted(cur_dir_videos, key=lambda x: file_ordering_key(x['path']))
                video_infos.extend(cur_dir_videos)
                return video_infos

            print(log_indent + 'find files...')
            log_indent += INDENT
            videos = traverse_directories(Path(root_path))
            if len(videos) == 0:
                continue

            log_indent = INDENT
            print(log_indent + 'prepare youtube services...')
            channels = []
            log_indent += INDENT
            for to in todo['to']:
                channel_name = to['channel']['name'] if ('channel' in to and 'name' in to['channel']) else to['client_secret']
                print('  name: ' + channel_name)
                youtube, args = api_uploader.open_youtube_service(to['client_secret'], to.get('channel', None))
                channels.append({
                    'svc': youtube, 
                    'args': args, 
                    'client_secret': to['client_secret'], 
                    'name': channel_name,
                    'playlist_id': to.get('playlist_id', None),
                    'channel_id' : to.get('channel', None)
                })

            print(log_indent + 'uploading files...')
            for video in videos:
                log_indent = INDENT+INDENT
                file_path = str(video['path'].absolute())
                print(log_indent + 'file processing start: ' + file_path)
                log_indent += INDENT
                title = ''
                for midname in video['hierarcy']:
                    args.title = f'{args.title}[{midname}]'
                title += ' ' + video['path'].stem
                print(log_indent + 'title: ' + title)
                
                if len(file_path) < 3 or len(title) < 3:
                    print(log_indent + 'video name or path length is wrong')
                    continue

                delete_file = True
                log_indent += INDENT
                for channel in channels:
                    if channel['name'] in self.__unavaliable_client:
                        delete_file = False
                        print(log_indent + 'this channel quota is exceeded or unavailable: ' + channel['name'])
                        continue

                    args = channel['args']
                    args.file = file_path
                    args.title = title
                    args.playlist_id = channel['playlist_id']
                    args.channel_id = channel['channel_id']
                    print(log_indent + 'channel: ' + channel['name'])
                    print(log_indent + 'playlist: ' + str(args.playlist_id))
                    print(log_indent + 'uploading...')

                    if not api_uploader.upload(channel['svc'], channel['client_secret'], args):
                        delete_file = False
                        self.__unavaliable_client.append(channel['name'])
                        continue    # continue to next channel

                if delete_file: # trash file
                    print(log_indent + 'delete ' + file_path)
                    video['path'].rename(Path.home()/'.Trash'/video['path'].name)
                else: 
                    print(log_indent + video['path'].name + ' is not deleted because uploading failed to some of channel(s)')

        print('todo processing done.')

if __name__ == '__main__':
    if getattr(sys, 'frozen', False):
        # runned executable built by pyinstaller
        # print("meipass: "  + sys._MEIPASS)
        root_path = str(Path(sys.executable).parent)
    else:
        root_path = os.curdir

    tube = Youtubeee(root_path)
    if not tube.init():
        print('error or nothing to do')
    else:
        tube.run_todos()