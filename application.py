# -*- coding: utf-8 -*-

import os
from threading import Thread
import flask
import requests
import io
import spacy
from tika import parser as p
import json
from flask_cors import CORS

# Load the installed model "en_core_web_sm"
nlp = spacy.load("en_core_web_sm")
import google.oauth2.credentials
import google_auth_oauthlib.flow
import googleapiclient.discovery
import requests

# This variable specifies the name of a file that contains the OAuth 2.0
# information for this application, including its client_id and client_secret.
CLIENT_SECRETS_FILE = "./client_secret.json"

# This OAuth 2.0 access scope allows for full read/write access to the
# authenticated user's account and requires requests to use an SSL connection.
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
API_SERVICE_NAME = "drive"
API_VERSION = "v3"

app = flask.Flask(__name__)
# Note: A secret key is included in the sample so that it works.
# If you use this code in your application, replace this with a truly secret
# key. See https://flask.palletsprojects.com/quickstart/#sessions.
app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'
app.config["SESSION_COOKIE_DOMAIN"] = "studysphere-parser.arguflow.ai"
CORS(
    app,
    supports_credentials=True,
    resources={r"*": {"origins": "http://localhost:3000"}},
)


def upload_data(drive, filesIds, js):
    for file_id in filesIds:
        file = (
            drive.files()
            .get(fileId=file_id, fields="webViewLink, mimeType,name")
            .execute()
        )
        if (
            file["mimeType"] == "application/vnd.google-apps.document"
            or file["mimeType"] == "application/vnd.google-apps.presentation"
        ):
            try:
                request = drive.files().export_media(
                    fileId=file_id, mimeType="text/plain"
                )
                binfile = io.BytesIO(request.execute())
                binfile.seek(0)
                docfile = binfile.read().decode("utf-8")
                doc = nlp(docfile)
                combined_list = [
                    list(doc.sents)[i : i + 20]
                    for i in range(0, len(list(doc.sents)), 20)
                ]
                combined_sents = [
                    " ".join([str(sent) for sent in chunk]) for chunk in combined_list
                ]
                for chunk in combined_sents:
                    body = {
                        "card_html": chunk,
                        "link": file["webViewLink"],
                        "tags": [file["mimeType"]],
                        "private": True,
                        "metadata": {
                            "name": file["name"],
                        },
                    }
                    r = requests.post(
                        "https://studysphere-backend.arguflow.ai/api/card",
                        json=body,
                        headers={
                            "Authorization": js.get("vault_api_key"),
                        },
                    )
            except Exception as e:
                raise Exception("Error while parsing file: " + json.dumps(file))
        else:
            request = drive.files().get_media(fileId=file_id)
            binfile = io.BytesIO(request.execute())
            binaryFile = p.from_buffer(binfile)
            docfile = binaryFile["content"].strip()
            doc = nlp(docfile)
            combined_list = [
                list(doc.sents)[i : i + 20] for i in range(0, len(list(doc.sents)), 20)
            ]
            combined_sents = [
                " ".join([str(sent) for sent in chunk]) for chunk in combined_list
            ]

            for chunk in combined_sents:
                body = {
                    "card_html": chunk,
                    "link": file["webViewLink"],
                    "tags": [file["mimeType"]],
                    "private": True,
                    "metadata": {
                        "name": file["name"],
                    },
                }
                r = requests.post(
                    "https://studysphere-backend.arguflow.ai/api/card",
                    json=body,
                    cookies={
                        "vault": js.get("vault_api_key"),
                    },
                )


@app.route("/upload_gdrive", methods=["POST"])
def upload_gdrive():
    if "google_credentials" not in flask.request.json:
        return flask.make_response("User is not google authed", 401)
    if "vault_api_key" not in flask.request.json:
        return flask.make_response("User is not arguflow authed", 401)

    # Load credentials from the session.
    credentials = google.oauth2.credentials.Credentials(
        token=flask.request.json.get("google_credentials"),
    )

    drive = googleapiclient.discovery.build(
        API_SERVICE_NAME, API_VERSION, credentials=credentials
    )

    fileIds = flask.request.json["filesIds"]
    Thread(target=upload_data, args=(drive, fileIds, flask.request.json)).start()
    # Thread(target=upload_data, args=(drive, fileIds, flask.request.json)).start()
    flask.session["google_credentials"] = credentials_to_dict(credentials)
    return flask.make_response("Success", 200)


@app.route("/authorize")
def authorize():
    # Create flow instance to manage the OAuth 2.0 Authorization Grant Flow steps.
    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES
    )

    # The URI created here must exactly match one of the authorized redirect URIs
    # for the OAuth 2.0 client, which you configured in the API Console. If this
    # value doesn't match an authorized URI, you will get a 'redirect_uri_mismatch'
    # error.
    flow.redirect_uri = flask.url_for("oauth2callback", _external=True)

    authorization_url, state = flow.authorization_url(
        # Enable offline access so that you can refresh an access token without
        # re-prompting the user for permission. Recommended for web server apps.
        access_type="offline",
        # Enable incremental authorization. Recommended as a best practice.
        include_granted_scopes="true",
    )

    # Store the state so the callback can verify the auth server response.
    flask.session["state"] = state
    resp = flask.make_response(authorization_url, 200)
    resp.set_cookie("state", json.dumps(state))
    return resp


@app.route("/oauth2callback")
def oauth2callback():
    # Specify the state when creating the flow in the callback so that it can
    # verified in the authorization server response.
    # state = flask.session["state"]

    flow = google_auth_oauthlib.flow.Flow.from_client_secrets_file(
        CLIENT_SECRETS_FILE, scopes=SCOPES
    )
    flow.redirect_uri = flask.url_for("oauth2callback", _external=True)

    # Use the authorization server's response to fetch the OAuth 2.0 tokens.
    authorization_response = flask.request.url
    flow.fetch_token(authorization_response=authorization_response)

    # Store credentials in the session.
    # ACTION ITEM: In a production app, you likely want to save these
    #              credentials in a persistent database instead.
    credentials = flow.credentials
    flask.session.permanent = True
    flask.session["credentials"] = credentials_to_dict(credentials)
    resp = flask.make_response(
        flask.redirect(
            "https://studysphere-parser.arguflow.ai/auth_success?state="
            + json.dumps(credentials_to_dict(credentials))
        )
    )
    resp.set_cookie(
        "google_credentials",
        json.dumps(credentials_to_dict(credentials)),
        domain="localhost",
    )
    return resp


@app.route("/revoke")
def revoke():
    if "credentials" not in flask.session:
        return (
            'You need to <a href="/authorize">authorize</a> before '
            + "testing the code to revoke credentials."
        )

    credentials = google.oauth2.credentials.Credentials(**flask.session["credentials"])

    revoke = requests.post(
        "https://oauth2.googleapis.com/revoke",
        params={"token": credentials.token},
        headers={"content-type": "application/x-www-form-urlencoded"},
    )

    status_code = getattr(revoke, "status_code")
    if status_code == 200:
        return "Credentials successfully revoked."
    else:
        return "An error occurred."


@app.route("/clear")
def clear_credentials():
    if "credentials" in flask.session:
        del flask.session["credentials"]
    return "Credentials have been cleared.<br><br>"


def credentials_to_dict(credentials):
    return {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
    }


@app.route("/arguflow_register", methods=["POST"])
def register():
    body = flask.request.json
    r = requests.post(
        "https://studysphere-api.arguflow.ai/api/invitation",
        json={"email": body["email"], "referral_tokens": []},
        headers={
            "Content-Type": "application/json",
            "Origin": "https://studysphere.ai",
        },
    )
    if r.ok:
        invUrl = r.json()["registration_url"]
        invToken = invUrl.split("/")[-1].split("?")[0]
        res = requests.post(
            "https://studysphere-api.arguflow.ai/api/register/" + invToken,
            json={
                "password": body["password"],
                "password_confirmation": body["password"],
            },
        )
        if res.ok:
            req = requests.post(
                "https://studysphere-api.arguflow.ai/api/auth",
                json={"email": body["email"], "password": body["password"]},
            )
            if req.ok:
                flask.session.permanent = True
                resp = flask.make_response("Success", 200)
                flask.session["vault"] = req.cookies["vault"]
                return resp
        else:
            return flask.make_response("Failed", 500)
    else:
        return flask.make_response("Failed", 500)


@app.route("/arguflow_login", methods=["POST"])
def login():
    body = flask.request.json
    req = requests.post(
        "https://studysphere-api.arguflow.ai/api/auth",
        json={"email": body["email"], "password": body["password"]},
    )
    print(req.text)
    if req.ok:
        flask.session.permanent = True
        resp = flask.make_response("Success", 200)
        flask.session["vault"] = req.cookies["vault"]
        return resp


@app.route("/arguflow_logout", methods=["POST"])
def logout():
    del flask.session["vault"]
    resp = flask.make_response("Success", 200)
    return resp


@app.route("/get_text", methods=["POST"])
def get_text():
    if "google_credentials" not in flask.request.json:
        return flask.make_response("User is not google authed", 401)

    # Load credentials from the session.
    credentials = google.oauth2.credentials.Credentials(
        token=flask.request.json.get("google_credentials"),
    )

    drive = googleapiclient.discovery.build(
        API_SERVICE_NAME, API_VERSION, credentials=credentials
    )
    response = []
    fileIds = flask.request.json()["filesIds"]
    for file_id in fileIds:
        file = drive.files().get(fileId=file_id).execute()
        if (
            file["mimeType"] == "application/vnd.google-apps.document"
            or file["mimeType"] == "application/vnd.google-apps.presentation"
        ):
            request = drive.files().export_media(fileId=file_id, mimeType="text/plain")
            file = io.BytesIO(request.execute())
            file.seek(0)
            docfile = file.read().decode("utf-8")
            response.append(docfile)
        else:
            request = drive.files().get_media(fileId=file_id)
            file = io.BytesIO(request.execute())
            binaryFile = p.from_buffer(file)
            docfile = binaryFile["content"].strip()
            response.append(docfile)

    return flask.jsonify(response)


if __name__ == "__main__":
    # When running locally, disable OAuthlib's HTTPs verification.
    # ACTION ITEM for developers:
    #     When running in production *do not* leave this option enabled.
    os.environ["OAUTHLIB_INSECURE_TRANSPORT"] = "1"

    # Specify a hostname and port that are set as a valid redirect URI
    # for your API project in the Google API Console.
    app.run("localhost", 8080, debug=True)
