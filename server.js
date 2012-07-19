var http = require("http")
var url = require("url")
var queryString = require("querystring")
var S = require("string")
var redis = require("redis"),
	client = redis.createClient();


client.on("error", function (err) {
    console.log("error event - " + client.host + ":" + client.port + " - " + err);
});


http.createServer(onRequest).listen(8080);

function onRequest(req, res) {
	var pathName = url.parse(req.url).pathname
	var postData=""
	req.setEncoding("utf8")
	req.addListener("data", function(chunk){
		postData+=queryString.unescape(chunk)
	});
	req.addListener("end", function(){
		if(req.method == "GET") doGet(req, res, pathName)
		else if(req.method == "POST") doPost(res, postData, pathName)
	})
}

function doGet(req, res, pathName) {
	if(pathName=='/') {
		var body = 'Hello and Welcome to this Fantastic URL Shortener!!' +
		'<form action="/create" method="post" >'+
		'<input type="text" name="target"><input type="submit" value="Shorten!">'+
		'</form>' 

		res.writeHead(200, {"Content-Type": "text/html"})
		res.write(body)
		res.end()
	} else if(S(pathName).startsWith('/stat')) {
		stat(req, res, pathName)
	} else redirect(req, res, pathName)		
}

function doPost(res, postData, pathName){
	if(pathName=='/create') {
		console.log(postData)
		var target = queryString.parse(postData).target
		var key    = shortenUrl(target)
		res.writeHead(200, {"Content-Type": "text/plain"})
		res.write("Thank you. Here is the shortened link: http://localhost:8080/" + key)
		res.write("\nSee url stats: http://localhost:8080/stat/"+key)
		res.end();
	}
}

function getKey() {
	var chars ="1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM".split("")
	var key =""
	for(var i=0;i<5;i++) {
		var idx = Math.floor(Math.random()*chars.length)
		key+=chars[idx]
	}
	return key
} 

function shortenUrl(target) {
	key = getKey()
	var data = {}
	data.url = target;
	data.hitCount = 0
	var jsonString = JSON.stringify(data);
	client.set(key, jsonString)
	return key
}

function redirect(req, res, pathName) {
	var key = S(pathName).right(5).s
	console.log("Looking up key: " + key)
	client.get(key, function (err, reply) {
		if (err || reply == null) {
			showNotFound(res)
		}  else {
			var j = JSON.parse(reply)
			if(!S(j.url).startsWith('http://')){
				j.url = 'http://'+j.url
			} 
			res.writeHead(302, { "Location": j.url});
			j.hitCount = j.hitCount + 1
			client.set(key, JSON.stringify(j))
			res.end();
		}
	})
}

function stat(req, res, path) {
	var key = S(path).right(5).s
	client.get(key, function(err, reply) {
		if (err || reply == null) {
			showNoStats(res, key)
		}  else {
			var j = JSON.parse(reply)
			res.writeHead(200, {"Content-Type": "text/plain"})
			res.write("Stats for http://localhost:8080/"+key)
			res.write("\nLink target: " + j.url)
			res.write("\nClick count: " + j.hitCount)
			res.end();
		}
	}) 
}

function showNotFound(res) {	
	res.writeHead(200, {"Content-Type": "text/plain"})
	res.write("Sorry. that shortened url does not exist... =(")
	res.end();
}

function showNoStats(res, key) {
	res.writeHead(200, {"Content-Type": "text/plain"})
	res.write("Sorry. that shortened url does not exist... =(")
	res.write("\nCreate a new one here: http://localhost:8080/")
	res.end();
}
