import types
import json
import os
import v3.uploader as api_uploader

class youtubeee:
    def __init__(self, working_dir='./'):
        self.__working_dir = working_dir
        self.__quota_exceeded_client = []
        self.__config = types.SimpleNamespace()
        self.__config.video_extensions = ['.mp4', '.mkv', '.webm']
    
    def init(self) -> bool:
        todo_path = os.path.join(self.__working_dir, 'todo.json')
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

    def __check_quota_limit(self, client_secret_file):
        for client_name in self.__quota_exceeded_client:
            if client_name in client_secret_file:
                print(f'[{client_name}] quota exceeded by previous request')
                return True
        return False

    def run_todos(self):
        for todo in self.__todo:
            def upload_to(to):
                root_path = todo['file_path']
                print('start processing ' + root_path)

                youtube, args = api_uploader.open_youtube_service(to['client_secret'])

                def process_dir(path, hierachy_names=[]):
                    files = os.listdir(path)
                    video_files = []
                    for file in files:
                        full_path = os.path.join(path, file)
                        if os.path.isdir(full_path):
                            print('subdirectory searching: ' + path)
                            hierachy_names.append(os.path.basename(file))
                            if process_dir(full_path, hierachy_names) is False:
                                return False
                        elif os.path.splitext(file)[1] in self.__config.video_extensions:
                            video_files.append(file)
                    
                    if len(video_files) == 0:   # no video in this directory
                        return True

                    video_files = sorted(video_files, key=lambda x: int(''.join(filter(str.isdigit, x.split('.')[0]))))
                    for video_file in video_files:
                        print('video file: ' + video_file)
                        args.file = os.path.join(path, video_file)
                        args.title = ''
                        for midname in hierachy_names:
                            args.title = f'{args.title}[{midname}]'
                        args.title += ' ' + os.path.splitext(video_file)[0]
                        print('video title: ' + args.title)
                        
                        if len(video_file) < 3 or len(args.title) < 3:
                            print('video name or path length is wrong')
                            continue

                        args.playlist_id = to['youtube_playlist_id']
                        if not api_uploader.upload(youtube, args):
                            self.__quota_exceeded_client.append(os.path.basename(to['client_secret']))
                            print('quota exceeded.')
                            return False
                    return True
                
                return process_dir(root_path)


            for to in todo['to']:
                if self.__check_quota_limit(to['client_secret']):    # quota is exceeded.
                    continue
                elif not upload_to(to):    # upload failed.
                    continue

        print('todo processing done.')
    

tube = youtubeee()
if not tube.init():
    print('error or nothing to do')
    exit(1)
tube.run_todos()

        