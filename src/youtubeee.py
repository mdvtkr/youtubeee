#-*- coding:utf-8 -*-

import types
import json
import os, platform
import sys
import v3.uploader as api_uploader
from pathlib import Path
import time
import argparse
import unicodedata
from datetime import datetime
import re

__print = print
print = lambda x, intent=0:__print("   "*intent + x, flush=True)

class Youtubeee:
    def __init__(self, working_dir='./', todo_name='youtubeee.todo.json'):
        print(f"{os.linesep}{os.linesep}{type(self).__name__} start running: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime())}")
        self.__working_dir = working_dir
        self.__unavaliable_client = []
        self.__config = types.SimpleNamespace()
        self.__config.video_extensions = ['.mp4', '.mkv', '.webm', '.mov']
        self.__todo_name = todo_name
    
    def init(self) -> bool:
        todo_path = os.path.join(self.__working_dir, 'config', self.__todo_name)
        print('find todo file: ' + todo_path)
        if not os.path.exists(todo_path):
            print('todo.json does not exists.')
            return False

        f = open(todo_path, 'r', encoding='utf-8')
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
            # comes first if file name start with number
            # files ordered by timestamp come next
            def file_ordering_key(path:Path):
                name = path.stem
                timestamp = path.stat().st_mtime
                numbering = name.split('.')[0].split(' ')[0]
                if len(numbering) > 0 and str.isdigit(numbering):    # file name like ( '1.xxx' or '1 xxx' )
                    return (int(numbering), timestamp)
                else:
                    def is_valid_date(val:str, date_only=False) -> str:
                        if platform.system() == 'Windows':
                            modifier = '#'
                        else:
                            modifier = '-'

                        # yyyymmdd_hhmiss
                        # yyyymmdd
                        # yyyy-mm-dd
                        # yyyy.mm.dd
                        # yyyy.m.d
                        # yyyy-m-d
                        # yymmdd
                        # yy.m.d
                        # yy-m-d
                        # (re pattern, datetime format, length of date string)
                        available_formats = (
                            (r'^\d{8}_\d{6}', '%Y%m%d_%H%M%S', 15),
                            (r'^\d{8}', '%Y%m%d', 8),
                            (r'^\d{4}-\d{2}-\d{2}', '%Y-%m-%d', 10),
                            (r'^\d{4}.\d{2}.\d{2}', '%Y.%m.%d', 10),
                            (r'^\d{4}.\d{1}.\d{1}', '%Y.%{0}m.%{0}d'.format(modifier), 8),
                            (r'^\d{4}-\d{1}-\d{1}', '%Y-%{0}m-%{0}d'.format(modifier), 8),
                            (r'^\d{6}', '%y%m%d', 6),
                            (r'^\d{2}.\d{1}.\d{1}', '%y.%{0}m.%{0}d'.format(modifier), 6),
                            (r'^\d{2}-\d{1}-\d{1}', '%y-%{0}m-%{0}d'.format(modifier), 6),
                        )

                        for format in available_formats:
                            pat = format[0]
                            date_format = format[1]
                            length = format[2]

                            if date_only and length != len(val):
                                continue

                            date_str = val[:length]
                            prog = re.compile(pat)
                            if prog.match(date_str):
                                try:
                                    datetime.strptime(date_str, date_format)
                                    return date_str
                                except:
                                    continue                           

                        return None
                    
                    if date_str := is_valid_date(name):
                        int_key = int(date_str.replace('.', '').replace(' ', '').replace('-', '').replace('_', ''))
                    else:
                        int_key = sys.maxsize
                            
                    return (int_key, timestamp)

            def visit_directories(path:Path):
                video_infos = []         # add sorted files per path
                hierarchy_names = []
                if not path.exists():
                    return video_infos
                
                meta_json = None
                if (path/'files.json').exists():
                    with (path/'files.json').open('rt', encoding='utf-8') as f:
                        meta_json = json.load(f)

                def get_description(metas, file_name):
                    if metas == None:
                        return ""
                    
                    from difflib import SequenceMatcher
                    for meta in metas:
                        title = unicodedata.normalize('NFC', file_name) if sys.platform == 'darwin' else file_name      # macos Korean form is different from windows
                        if SequenceMatcher(None, title, meta['title']).quick_ratio() > 0.8:
                            return meta['text']
                    return ""
                
                for cur_file in sorted(path.iterdir()):
                    if cur_file.is_dir():
                        hierarchy_names.append(cur_file.name)
                        # add video in current directory
                        videos = [ { 'path':x, 'hierarchy':hierarchy_names.copy(), 'description': get_description(meta_json, x.name)} for x in cur_file.iterdir() if x.is_file() and x.suffix in self.__config.video_extensions ]
                    elif cur_file.suffix in self.__config.video_extensions:
                        videos = [ { 'path':cur_file, 'hierarchy':hierarchy_names.copy(), 'description': get_description(meta_json, cur_file.stem)} ]
                    else:
                        continue
                    videos = sorted(videos, key=lambda x: file_ordering_key(x['path']))
                    video_infos.extend(videos)

                return video_infos

            print('find files...', 1)
            videos = visit_directories(Path(root_path))
            if len(videos) == 0:
                continue

            print('prepare youtube services...', 1)
            channels = []
            for to in todo['to']:
                channel_name = to['channel']['name'] if ('channel' in to and 'name' in to['channel']) else to['client_secret']
                print('name: ' + channel_name, 2)
                youtube, args = api_uploader.open_youtube_service(to['client_secret'], to.get('channel', None))
                channels.append({
                    'svc': youtube, 
                    'args': args, 
                    'client_secret': to['client_secret'], 
                    'name': channel_name,
                    'playlist_id': to.get('playlist_id', None),
                    'channel_id' : to.get('channel', None)
                })

            print('uploading files...', 1)
            for video in videos:
                file_path = str(video['path'].absolute())
                print('file processing start: ' + file_path, 2)
                title = ''
                for midname in video['hierarchy']:
                    title = f'{title}[{midname}]'
                title += ' ' + video['path'].stem
                print('title: ' + title, 3)
                
                if len(file_path) < 3 or len(title) < 3:
                    print('video name or path length is wrong', 4)
                    continue

                delete_file = True
                for channel in channels:
                    if channel['name'] in self.__unavaliable_client:
                        delete_file = False
                        print('this channel quota is exceeded or unavailable: ' + channel['name'], 4)
                        continue

                    args = channel['args']
                    args.file = file_path
                    args.title = title
                    args.description = video['description']
                    args.playlist_id = channel['playlist_id']
                    args.channel_id = channel['channel_id']
                    print('channel: ' + channel['name'], 3)
                    print('playlist: ' + str(args.playlist_id), 3)
                    print('uploading...', 3)

                    if not api_uploader.upload(channel['svc'], channel['client_secret'], args):
                        delete_file = False
                        self.__unavaliable_client.append(channel['name'])
                        continue    # continue to next channel

                def trash_file():
                    cur_os = platform.system().lower()
                    if 'darwin' in cur_os:
                        video['path'].rename(Path.home()/'.Trash'/video['path'].name)
                    elif 'linux' in cur_os:
                        (Path.home()/'.local'/'files').mkdir(parents=True, exist_ok=True)
                        video['path'].rename(Path.home()/'.local'/'files'/video['path'].name)

                if delete_file: # trash file
                    print('delete ' + file_path, 2)
                    trash_file()
                else: 
                    print(video['path'].name + ' is not deleted because uploading failed to some of channel(s)', 2)

        print('todo processing done.')

if __name__ == '__main__':
    if getattr(sys, 'frozen', False):
        # runned executable built by pyinstaller
        # print("meipass: "  + sys._MEIPASS)
        root_path = str(Path(sys.executable).parent)
    else:
        root_path = os.curdir

    parser = argparse.ArgumentParser()
    parser.add_argument('-t', '--todo', default='youtubeee.todo.json', help='specify todo file name. default name is "youtubeee.todo.json"', dest='todo')

    args = parser.parse_args()
    
    tube = Youtubeee(working_dir=root_path, todo_name=args.todo)
    if not tube.init():
        print('error or nothing to do')
    else:
        tube.run_todos()