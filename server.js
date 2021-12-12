var express = require("express");
var url = require("url");
var bodyParser = require("body-parser");
var randomstring = require("randomstring");
var cons = require("consolidate");
var nosql = require("nosql").load("database.nosql");
var querystring = require("querystring");
var _ = require("underscore");
_.string = require("underscore.string");

var app = express();
app.engine("html", cons.underscore);
app.set("view engine", "html");
app.set("views", "authorizationServer");
app.set("json spaces", 4);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var redirect_url;
var state_data;
var code;
var client_data;

app.get("/authorize", function (req, res) {
  // redirect data from request.
  redirect_url = req.query.redirect_uri;
  // Client Data from request
  client_data = req.query.client_id;
  console.log("Redirect URL is %s", redirect_url);

  // scope data from request
  var scope_data = req.query.scope;
  console.log("Inside authorize function");
  // State Data from Request
  state_data = req.query.state;

  console.log("Client ID from Alexa app is %s", client_data);
  console.log("State Value passed from Alexa app is %s", state_data);
  console.log("Scope data is %s", scope_data);
  console.log("Final point here");

  res.sendFile(__dirname + "/index.html");
});

app.get("/approve", (req, res) => {
  var username = req.body.username;
  var password = req.body.password;

  nosql.insert({ username: username, password: password });

  res.sendFile(__dirname + "/approve.html");
});

app.post("/authcode", (req, res) => {
  if (req.body.approve) {
    code = randomstring.generate(8);

    var urlParsed = buildUrl(redirect_url, { code: code, state: state_data });

    console.log(urlParsed);

    return res.redirect(urlParsed);
  } else {
    var urlParsed = buildUrl(redirect_url, { error: "access_denied" });
    return res.redirect(urlParsed);
  }
});

app.post("/token", (req, res) => {
  if (req.body.grant_type == "authorization_code") {
    var access_token = randomstring.generate();
    var refresh_token = randomstring.generate();

    nosql.insert({ access_token: access_token });

    nosql.insert({ refresh_token: refresh_token });

    console.log("Issuing access token %s", access_token);

    var token_response = {
      access_token: access_token,
      token_type: "Bearer",
      refresh_token: refresh_token,
      expire_in: "3600",
    };

    res.status(200).json(token_response);
    console.log("Issued tokens for code %s", req.body.code);

    return;
  } else if (req.body.grant_type == "refresh_token") {
    var access_token = randomstring.generate();
    nosql.insert({ access_token: access_token, client_id: clientId });
    var token_response = {
      access_token: access_token,
      token_type: "Bearer",
      refresh_token: token.refresh_token,
      expire_in: "3600",
    };
    res.status(200).json(token_response);
    return;
  } else {
    console.log("Unknown grant type %s", req.body.grant_type);
    res.status(400).json({ error: "unsupported_grant_type" });
  }
});

var buildUrl = (base, options, hash) => {
  console.log("base", base);
  var newUrl = url.parse(base, true);
  delete newUrl.search;
  if (!newUrl.query) {
    newUrl.query = {};
  }
  _.each(options, (value, key, list) => {
    newUrl.query[key] = value;
  });
  if (hash) {
    newUrl.hash = hash;
  }
  return url.format(newUrl);
};

var server = app.listen(4007, "localhost", function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("Authorization server is listening at http://%s:%s", host, port);
});
