import http.client
import httplib2
import os
import random
import sys
import time
import types
import json
import pathlib

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaFileUpload
from oauth2client.client import flow_from_clientsecrets
from oauth2client.file import Storage
from oauth2client.tools import argparser, run_flow
from oauth2client.client import HttpAccessTokenRefreshError


# Explicitly tell the underlying HTTP transport library not to retry, since
# we are handling retry logic ourselves.
httplib2.RETRIES = 1

# Maximum number of times to retry before giving up.
MAX_RETRIES = 1

# Always retry when these exceptions are raised.
RETRIABLE_EXCEPTIONS = (httplib2.HttpLib2Error, IOError, http.client.NotConnected,
  http.client.IncompleteRead, http.client.ImproperConnectionState,
  http.client.CannotSendRequest, http.client.CannotSendHeader,
  http.client.ResponseNotReady, http.client.BadStatusLine)

# Always retry when an apiclient.errors.HttpError with one of these status
# codes is raised.
RETRIABLE_STATUS_CODES = [500, 502, 503, 504]

# The CLIENT_SECRETS_FILE variable specifies the name of a file that contains
# the OAuth 2.0 information for this application, including its client_id and
# client_secret. You can acquire an OAuth 2.0 client ID and client secret from
# the Google API Console at
# https://console.cloud.google.com/.
# Please ensure that you have enabled the YouTube Data API for your project.
# For more information about using OAuth2 to access the YouTube Data API, see:
#   https://developers.google.com/youtube/v3/guides/authentication
# For more information about the client_secrets.json file format, see:
#   https://developers.google.com/api-client-library/python/guide/aaa_client_secrets
CLIENT_SECRETS_FILE = "client_secrets.json"

# This OAuth 2.0 access scope allows an application to upload files to the
# authenticated user's YouTube channel, but doesn't allow other types of access.
# upload, add to playlist scope
YOUTUBE_UPLOAD_SCOPE = ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtubepartner"]
YOUTUBE_API_SERVICE_NAME = "youtube"
YOUTUBE_API_VERSION = "v3"

# This variable defines a message to display if the CLIENT_SECRETS_FILE is
# missing.
MISSING_CLIENT_SECRETS_MESSAGE = """
WARNING: Please configure OAuth 2.0

To make this sample run you will need to populate the client_secrets.json file
found at:

   %s

with information from the API Console
https://console.cloud.google.com/

For more information about the client_secrets.json file format, please visit:
https://developers.google.com/api-client-library/python/guide/aaa_client_secrets
""" % os.path.abspath(os.path.join(os.path.dirname(__file__),
                                   CLIENT_SECRETS_FILE))

VALID_PRIVACY_STATUSES = ("public", "private", "unlisted")

OK=0
QUOTA_EXCEEDED=2
NOK=1

def get_authenticated_service(args):
  flow = flow_from_clientsecrets(args.client_secret,
    scope=YOUTUBE_UPLOAD_SCOPE,
    message=MISSING_CLIENT_SECRETS_MESSAGE
    )
    
  print(f"request {args.channel.get('name', '')} oauth")
  storage = Storage(f"{os.path.splitext(args.client_secret)[0]}-oauth2.json")
  credentials = storage.get()

  if credentials is None or credentials.invalid:
    credentials = run_flow(flow, storage, args)

  return build(YOUTUBE_API_SERVICE_NAME, 
               YOUTUBE_API_VERSION,
               http=credentials.authorize(httplib2.Http()),
               static_discovery=False)

def add_video_to_playlist(youtube,videoID,playlistID):
  response = youtube.playlistItems().insert(
        part="snippet",
        body={
          'snippet': {
            'playlistId': playlistID, 
            'resourceId': {
              'kind': 'youtube#video',
              'videoId': videoID
            }
            #'position': 0    // insert into front
            }
        }
    ).execute()

  print(f"inserted into playlist {response['snippet']['title']} / "
        f"{response['snippet']['position']} in playlist")

def initialize_upload(youtube, options):
  print('preparing upload request...')
  tags = None
  if options.keywords:
    tags = options.keywords.split(",")

  print('  >title: ' + options.title)
  print('  >desc : ' + options.description if options.description != None else '')

  body=dict(
    snippet=dict(
      title=options.title,
      description=options.description,
      tags=tags,
      categoryId=options.category
    ),
    status=dict(
      privacyStatus=options.privacyStatus
    )
  )

  # Call the API's videos.insert method to create and upload the video.
  insert_request = youtube.videos().insert(
    part=",".join(body.keys()),
    body=body,
    # The chunksize parameter specifies the size of each chunk of data, in
    # bytes, that will be uploaded at a time. Set a higher value for
    # reliable connections as fewer chunks lead to faster uploads. Set a lower
    # value for better recovery on less reliable connections.
    #
    # Setting "chunksize" equal to -1 in the code below means that the entire
    # file will be uploaded in a single HTTP request. (If the upload fails,
    # it will still be retried where it left off.) This is usually a best
    # practice, but if you're using Python older than 2.6 or if you're
    # running on App Engine, you should set the chunksize to something like
    # 1024 * 1024 (1 megabyte).
    media_body=MediaFileUpload(options.file, chunksize=-1, resumable=True)
  )

  print(f'start uploading: {options.file}')
  try:
    video_id = resumable_upload(insert_request)
  except:
    raise

  print(f'uploaded: {options.file}')
  if video_id is not None:
    all_playlists = []
    if options.playlist_id is not None:
      all_playlists.append(options.playlist_id)
    if len(options.global_playlist_ids) > 0:
      all_playlists.extend(options.global_playlist_ids)

    for playlist_id in all_playlists:
      add_video_to_playlist(youtube, video_id, playlist_id)

# This method implements an exponential backoff strategy to resume a
# failed upload.
def resumable_upload(insert_request):
  response = None
  error = None
  retry = 0
  while response is None:
    try:
      print("Uploading file...")
      status, response = insert_request.next_chunk()
      if response is not None:
        if 'id' in response:
          print("Video id '%s' was successfully uploaded." % response['id'])
        else:
          exit("The upload failed with an unexpected response: %s" % response)
    except HttpError as e:
      if e.resp.status in RETRIABLE_STATUS_CODES:
        error = "A retriable HTTP error %d occurred:\n%s" % (e.resp.status, e.content)
      else:
        raise
    except RETRIABLE_EXCEPTIONS as e:
      error = "A retriable error occurred: %s" % e
    except Exception as e:
      print(repr(e))
      raise

    if error is not None:
      print(error)
      retry += 1
      if retry > MAX_RETRIES:
        exit("No longer attempting to retry.")

      max_sleep = 2 ** retry
      sleep_seconds = random.random() * max_sleep
      print("Sleeping %f seconds and then retrying..." % sleep_seconds)
      time.sleep(sleep_seconds)

  if response is not None:
    return response['id']
  else:
    return None

def upload(youtube, client_secret, args):
  if not os.path.exists(args.file):
    exit("file does not exist.")

  try:
    initialize_upload(youtube, args)
    return OK
  except HttpError as e:
    print ("An HTTP error %d occurred:\n%s" % (e.resp.status, e.content))
    if int(e.resp.status) == 403 and 'exceed' in e.content.decode('ascii'):   # quota is exceeded
      print('  quota exceeded')
      return QUOTA_EXCEEDED
    return NOK
  except HttpAccessTokenRefreshError as e:
    # refresh token expiry: https://developers.google.com/identity/protocols/oauth2?hl=ko#expiration
    print('token is invalidated. retry...')
    youtube2, args2 = open_youtube_service(client_secret, args.channel_id)
    return upload(youtube2, client_secret, args2)
  
def open_youtube_service(client_secret, channel):
  args = types.SimpleNamespace()
  args.auth_host_name = 'localhost'
  args.auth_host_port = [8080, 8090]
  args.category = '22'
  args.description = ''
  args.keywords = ''
  args.logging_level = 'ERROR'
  args.noauth_local_webserver = False
  args.privacyStatus = 'unlisted'
  args.client_secret = client_secret
  args.channel = channel

  return get_authenticated_service(args), args

