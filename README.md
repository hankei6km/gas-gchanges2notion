# gas-gchanges2notion

Google Drive 上の変更リストを Notion データベースへ送信する Google Apps Script ライブラリー。

実装中。

## Setup

ライブラリーは App Script で利用できる状態になっています。
Apps Script のコードエディターで以下の手順を実行するとプロジェクトへ追加できます。

1. コードエディターのファイル名一覧が表示される部分の「ライブラリ +」をクリック
1. 「スクリプト ID」フィールドに `1_fy-5TJZRGLUiksOZsjRx52b6T7T2jLuP0o_zVfjl5JNNRKW69EsKpE0` を入力し検索をクリック
1. バージョンを選択(通常は最新版)
1. 「ID」を `GchangesToNotion` へ変更
1. 「追加」をクリック

上記以外にも Release ページから `gas-gchanges2notion.zip` をダウンロードし、`/dist` ディレクトリーをプロジェクトへコピーできます。

## Usage

### Notion 側での手順

#### データベースを作成

変更内容が送信されるデータベースをが必要です。このリポジトリをローカルへ clone 後、以下のようにスクリプトを実行することで作成できます。
なお、実行には `jq` が必要です。

```console
$ export NOTION_API_KEY="<API KEY>"
$ export PARENT_PAGE_ID="データベースを作成するページのID"
$ export DATABASE_NAME="作成するデータベースの名前"
$ bash scripts/create_database.sh

user_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
database_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

#### Notion インテグレーションを作成

Notion 外部からデータベースを操作するためのインテグレーション(API KEY)が必要です。以下を参考に作成してください。

- [Getting started # Step 1: Create an integration.](https://developers.notion.com/docs/getting-started#step-1-create-an-integration)

#### インテグレーションへの許可

以下を参考に、用意したデータベースをインテグレーションと共有してください。

- [Getting started # Step 2: Share a database with your integration](https://developers.notion.com/docs/getting-started#step-2-share-a-database-with-your-integration)

## Google Apps Script で実行

スタンドアロンのスクリプトを作成し、`GchangesToNotion.send` に `Drive.Changes.list` の実行結果を渡すコードを記述します。

```ts
const props = PropertiesService.getScriptProperties()
const v = props.getProperties()
const apiKey = v.notion_api_key
const optsv = {
  database_id: v.database_id,
  ignoreIds: JSON.parse(v.ignore_ids),
  limit: 20
}

const res = Drive.Changes?.list({ pageToken })
GchangesToNotion.send(apiKey, opts, res)
```

`Drive.Changes.list` を実行するたためには Google Drive の変更通知(プッシュ通知)を受け取る必要があります。
「[Google Drive の変更通知を Google Apps Script で受け取る](https://zenn.dev/hankei6km/articles/receive-google-drive-chages-notifications-by-gas)」などを参照してください。

## TypeScript

TypeScript(clasp) でコードを記述している場合は、`@hankei6km/gas-gchanges2notion` を import することで型定義を利用できます。

```console
$ npm install --save-dev @hankei6km/gas-gchamnges2notion
```

## Known Issues

- 一部のファイルで追加しているカバー画像は、Notion 側へエントリー追加後に時間が経過すると表示されなくなります

## License

MIT License

Copyright (c) 2022 hankei6km
