BetaJS.Class.extend("BetaJS.Channels.Sender", [
	BetaJS.Events.EventsMixin,
	{
	
	send: function (message, data) {
		this.trigger("send", message, data);
		this._send(message, data);
	},
	
	_send: function (message, data) {}
	
}]);

BetaJS.Class.extend("BetaJS.Channels.Receiver", [
	BetaJS.Events.EventsMixin,
	{
		
	_receive: function (message, data) {
		this.trigger("receive", message, data);
		this.trigger("receive:" + message, data);
	}
	
}]);


BetaJS.Channels.Sender.extend("BetaJS.Channels.ReceiverSender", {
	
	constructor: function (receiver) {
		this._inherited(BetaJS.Channels.ReceiverSender, "constructor");
		this.__receiver = receiver;
	},
	
	_send: function (message, data) {
		this.__receiver._receive(message, data);
	}
	
});

BetaJS.Channels.Sender.extend("BetaJS.Channels.SenderMultiplexer", {
	
	constructor: function (sender, prefix) {
		this._inherited(BetaJS.Channels.SenderMultiplexer, "constructor");
		this.__sender = sender;
		this.__prefix = prefix;
	},
	
	_send: function (message, data) {
		this.__sender.send(this.__prefix + ":" + message, data);
	}
	
});

BetaJS.Channels.Receiver.extend("BetaJS.Channels.ReceiverMultiplexer", {

	constructor: function (receiver, prefix) {
		this._inherited(BetaJS.Channels.ReceiverMultiplexer, "constructor");
		this.__receiver = receiver;
		this.__prefix = prefix;
		this.__receiver.on("receive", function (message, data) {
			if (BetaJS.Strings.starts_with(message, this.__prefix + ":")) {
				this._receive(BetaJS.Strings.strip_start(message, this.__prefix + ":"), data);
			}
		}, this);
	}
		
});



BetaJS.Class.extend("BetaJS.Channels.TransportChannel", {
	
	constructor: function (sender, receiver, options) {
		this._inherited(BetaJS.Channels.TransportChannel, "constructor");
		this.__sender = sender;
		this.__receiver = receiver;
		this.__options = BetaJS.Objs.extend(options, {
			timeout: 10000,
			tries: 1,
			timer: 500
		});
		this.__receiver.on("receive:send", function (data) {
			this.__reply(data);
		}, this);
		this.__receiver.on("receive:reply", function (data) {
			this.__complete(data);
		}, this);
		this.__sent_id = 0;
		this.__sent = {};
		this.__received = {};
		this.__timer = this._auto_destroy(new BetaJS.Timers.Timer({
			delay: this.__options.timer,
			context: this,
			fire: this.__maintenance
		}));
	},
	
	// Returns Promise
	_reply: function (message, data) {},
	
	send: function (message, data, options) {
		var promise = BetaJS.Promise.create();
		options = options || {};
		if (options.stateless) {
			this.__sender.send("send", {
				message: message,
				data: data,
				stateless: true
			});
			promise.asyncSuccess(true);
		} else {
			this.__sent_id++;
			this.__sent[this.__sent_id] = {
				message: message,
				data: data,
				tries: 1,
				time: BetaJS.Time.now(),
				id: this.__sent_id,
				promise: promise
			};
			this.__sender.send("send", {
				message: message,
				data: data,
				id: this.__sent_id
			});
		}
		return promise;
	},
	
	__reply: function (data) {
		if (data.stateless) {
			this._reply(data.message, data.data);
			return;
		}
		if (!this.__received[data.id]) {
			this.__received[data.id] = data;
			this.__received[data.id].time = BetaJS.Time.now();
			this.__received[data.id].returned = false;
			this.__received[data.id].success = false;
			this._reply(data.message, data.data).success(function (result) {
				this.__received[data.id].reply = result;
				this.__received[data.id].success = true;
			}, this).error(function (error) {
				this.__received[data.id].reply = error;
			}, this).callback(function () {
				this.__received[data.id].returned = true;
				this.__sender.send("reply", {
					id: data.id,
					reply: data.reply,
					success: data.success
				});
			}, this);			  
		} else if (this.__received[data.id].returned) {
			this.__sender.send("reply", {
				id: data.id,
				reply: data.reply,
				success: data.success
			});
		}
	},
	
	__complete: function (data) {
		if (this.__sent[data.id]) {
			var promise = this.__sent[data.id].promise;
			promise[data.success ? "asyncSuccess" : "asyncError"](data.reply);
			delete this.__sent[data.id];
		}
	},
	
	__maintenance: function () {
		var now = BetaJS.Time.now();
		for (var received_key in this.__received) {
			var received = this.__received[received_key];
			if (received.time + this.__options.tries * this.__options.timeout <= now)
				delete this.__received[received_key];
		}
		for (var sent_key in this.__sent) {
			var sent = this.__sent[sent_key];
			if (sent.time + sent.tries * this.__options.timeout <= now) {
				if (sent.tries < this.__options.tries) {
					sent.tries++;
					this.__sender.send("send", {
						message: sent.message,
						data: sent.data,
						id: sent.id
					});
				} else {
					sent.promise.asyncError({
						message: sent.message,
						data: sent.data
					});
					delete this.__sent[sent_key];
				}
			}
		}
	}
	
});
