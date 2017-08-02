var SLACK_ACCESS_TOKEN  = PropertiesService.getScriptProperties().getProperty('SLACK_ACCESS_TOKEN');
var SLACK_TEAM_NAME     = PropertiesService.getScriptProperties().getProperty('SLACK_TEAM_NAME');
var SPREAD_SHEET_ID     = PropertiesService.getScriptProperties().getProperty('SPREAD_SHEET_ID');
var SLACK_WEBHOOK_TOKEN = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK_TOKEN');
var APP_URL             = PropertiesService.getScriptProperties().getProperty('APP_URL');

// String Utilities

function string_sha1 (str) {
    var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, str);
    var str = "";
    for (var i = 1; i < raw.length; i++) {
        var byte = (raw[i] < 0 ? raw[i] + 256 : raw[i]).toString(16);
        if (byte.length == 1) str += "0";
        str += byte;
    }
    return str;
}

function random_string (length) {
    var str = "";
    for (var i = 1; i < length ; i++) {
        str += String.fromCharCode(97 + Math.random()*26);
    }
    return str;
}

// Slack utilities

function slack_post_message (channel, str) {
    var token = SLACK_ACCESS_TOKEN;
    var url   = 'https://slack.com/api/chat.postMessage'
    UrlFetchApp.fetch(url, { method: 'post', payload: { token: token, channel: channel, text: str, username: "invite url" } });
}

function slack_send_invitation (email) {
    var token = SLACK_ACCESS_TOKEN;
    var team  = SLACK_TEAM_NAME;
    var url   = 'https://' + team + '.slack.com/api/users.admin.invite'
    UrlFetchApp.fetch(url, { method: 'post', payload: { token: token, email: email, set_active: true } });
}

// invite token management

function create_token () {
    var sheet  = SpreadsheetApp.openById(SPREAD_SHEET_ID).getActiveSheet();
    var token = random_string(20);
    sheet.appendRow([string_sha1(token)]);
    return token;
}

function validate_and_consume_token (token) {
    var sheet  = SpreadsheetApp.openById(SPREAD_SHEET_ID).getActiveSheet();
    var values = sheet.getDataRange().getValues();
    var hashed = string_sha1(token);
    for (var i = 0; i < values.length; i++) {
        if (values[i][0] == hashed) {
            sheet.deleteRow(i + 1);
            return 1;
        }
    }
    return 0;
}

// APIs

function doGenerateToken (e) {
    var webhook_token = SLACK_WEBHOOK_TOKEN;
    if (e.parameter.token != webhook_token) return 0;
    var invite_token  = create_token();
    slack_post_message(
        "#" + e.parameter.channel_name,
        "ほれ:point_right: " + APP_URL + "?token=" + invite_token
    );
}

function doSendInvitation (e) {
    var validated = validate_and_consume_token(e.parameter.token);
    if (!validated) return HtmlService.createTemplateFromFile("error").evaluate();
    slack_send_invitation(e.parameter.email);
    slack_post_message("#general", "招待コード " + e.parameter.token + " が使われました :tada:");
    return HtmlService.createTemplateFromFile("done").evaluate();
}

function doGet (e) {
    var template = HtmlService.createTemplateFromFile("index");
    template.token = e.parameter.token || "";
    template.app_url = APP_URL;
    return template.evaluate();
}

function doPost(e) {
    if (e.parameter.channel_name) return doGenerateToken(e);
    else return doSendInvitation(e);
}
