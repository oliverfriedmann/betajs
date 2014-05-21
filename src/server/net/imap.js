BetaJS.Class.extend("BetaJS.Server.Net.Imap", [
	BetaJS.Events.EventsMixin,
	{
	
	constructor: function (auth, options) {
		this._inherited(BetaJS.Server.Net.Imap, "constructor");
		this.__auth = auth;
		this.__options = options || {};
		this.__count = 0;
		this.__Imap = require("imap");
		this.__connected = false;
		this.__imap = new this.__Imap(BetaJS.Objs.extend({
			tls : true,
			tlsOptions : {
				rejectUnauthorized : false
			}
		}, auth));
		var self = this;
		this.__imap.on("mail", function (mails) {
			self.__count += mails;
		});
		this.__imap.on("error", function () {
			self.trigger("error");
			if (options.reconnect_on_error)
				self.reconnect();
		});
	},
	
	destroy: function () {
		this.disconnect();
		this._inherited(BetaJS.Server.Net.Imap, "destroy");
	},
	
	connect: function (callbacks) {
		if (this.__connected)
			return;
		this.__count = 0;
		this.__imap.connect();
		var self = this;
		this.__imap.once('ready', function() {
			self.__imap.openBox("INBOX", true, function (err, box) {
				if (err) {
					BetaJS.SyncAsync.callback(callbacks, "failure", err);
					throw err;
				}
				self.__imap.on('mail', function (count) {
					self.trigger("new_mail", count);
				});
				BetaJS.SyncAsync.callback(callbacks, "success");
			});
		});
		this.__connected = true;
	},
	
	disconnect: function () {
		if (!this.__connected)
			return;
		this.__imap.end();
		this.__connected = false;
	},
	
	reconnect: function () {
		this.disconnect();
		this.connect();
	},
	
	count: function () {
		return this.__count;
	},
		
	/*
	 * body: boolean (= true)
	 * headers: boolean (= true)
	 * seq_from
	 * seq_to
	 * seq_count
	 * reverse
	 */
	fetch: function (options, callbacks) {
		options = options || {};
		var bodies = [];
		if (!("headers" in options) || options.headers)
			bodies.push('HEADER.FIELDS (FROM TO SUBJECT DATE)');
		if (!("body" in options) || options.body)
			bodies.push('TEXT');
		var seq_start = 1;
		var seq_end = 100;
		if (options.seq_count) {
			if (options.seq_end) {
				seq_end = options.seq_end;
				seq_start = seq_end - options.seq_count + 1;
			} else {
				seq_start = options.seq_start || seq_start;
				seq_end = seq_start + options.seq_count - 1;
			}
		} else {
			seq_start = options.seq_start || seq_start;
			seq_end = options.seq_end || seq_start + 99;
		}
		if (options.reverse) {
			var dist = seq_end - seq_start;
			seq_end = this.__count - seq_start + 1;
			seq_start = seq_end - dist;
		}
		var f = this.__imap.seq.fetch(seq_start + ":" + seq_end, {
			bodies : bodies,
			struct : true
		});
		this.__query(f, callbacks);
	},
	
	__query: function (f, callbacks) {
		var self = this;
		var mails = [];
		f.on('message', function(msg, seqno) {
			var attrs = {};
			var header_buffer = '';
			var body_buffer = '';
			msg.on('body', function(stream, info) {
				stream.on('data', function(chunk) {
					if (info.which === 'TEXT')
						body_buffer += chunk.toString('utf8');
					else
						header_buffer += chunk.toString('utf8');
				});
			});
		  	msg.once('attributes', function (a) {
		  		attrs = a;
	      	});
	      	msg.once('end', function() {
		  		attrs.seqno = seqno;
	      		var mail = self.__parse(self.__Imap.parseHeader(header_buffer), body_buffer, attrs);
				if (mail)
					mails.push(mail);
			});
		});
		f.once('error', function(err) {
			BetaJS.SyncAsync.callback(callbacks, "failure", err);
		});
		f.once('end', function() {
			BetaJS.SyncAsync.callback(callbacks, "success", mails);
		});			
	},
	
	__parse: function (header, body, attrs) {
		var mail = {};
		/* Attrs */
    	mail.uid = attrs.uid;
    	mail.threadid = attrs['x-gm-thrid'];
    	mail.id = attrs.uid;
    	mail.seqid = attrs.seqno;
    	/* Header */
    	if (header && header.subject && header.subject.length > 0)
			mail.subject = header.subject[0];
    	if (header && header.to && header.to.length > 0)
			mail.to = header.to[0];
    	if (header && header.from && header.from.length > 0)
			mail.from = header.from[0];
    	if (header && header.date && header.date.length > 0) {
			var d = new Date(header.date[0]);
			mail.date = d.getTime();
		}
		if (body) {
			/* Meta Body */
			var struct = attrs.struct;
			var parts = [];
			if (struct.length > 1) {
				var boundary = struct[0].params.boundary;
				var rest = body;
				for (var i = 1; i < struct.length; ++i) {
					var obj = struct[i][0] || {};
					// Remove everything before boundary
					rest = rest.substring(rest.indexOf(boundary) + boundary.length);
					// Remove everything before empty line
					rest = rest.substring(rest.indexOf("\r\n\r\n") + "\r\n\r\n".length);
					// Ignore attachments for now
					if (obj.disposition || obj.type != 'text')
						continue;
					var j = rest.indexOf(boundary);
					parts.push({meta: obj, body: j >= 0 ? rest.substring(0, j) : rest});
				}
			} else
				parts.push({meta: struct[0], body: body});
			var html_body = null;
			var text_body = null;
			for (var k = 0; k < parts.length; ++k) {
				var encoded = parts[k].body;
				if (parts[k].meta.encoding.toLowerCase() == "base64")
					encoded = new Buffer(encoded, parts[k].meta.encoding).toString(parts[k].meta.params.charset);
				if (parts[k].meta.subtype == "html")
					html_body = encoded;
				else
					text_body = encoded;
			}
			if (text_body === null && html_body !== null)
				text_body = BetaJS.Strings.strip_html(html_body);
			mail.html_body = html_body;
			mail.text_body = text_body;
		}
		return mail;
	}

}]);