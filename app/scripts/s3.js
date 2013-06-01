define(['jquery', 'underscore', 'crypto', 'base64'], function($, _, Crypto, base64) {
	var S3Request = function() {
		this.verb = 'GET';
		this.host = '';
		this.bucketname = '';
		this.path = '';
		this.headers = {
			'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
		};
		this.date = new Date().toGMTString();
		this.content = '';
		this.request_parameters = {};

		this.sign = function(key, secret) {
			this.headers['Authorization'] = 'AWS '+key+':'+this.signature(secret);
		};
		this.signature = function(secret) {
			return base64.btoa(Crypto.HMAC(Crypto.SHA1, this._toSign(), secret, {asString: true}));
		};
		this.make_request = function(async) {
			async = !!async;
			this.headers['Host'] = this.hostname;
			this.headers['x-amz-date'] = this.date;
			var req = $.ajax(this._url(), {
				async: async,
				type: this.verb,
				contentType: this.headers['Content-Type'],
				crossDomain: true,
				data: this.content,
				headers: this.headers,
			});
			if(async) {
				return req;
			} else {
				return req.response;
			}
		};

		this._toSign = function() {
			return [
				this.verb.toUpperCase(),
				"",
				this.headers['Content-Type'],
				'',
				this._canonicalized_amz_headers(),
				this._canonicalized_resource()
			].join('\n');
		};
		this._canonicalized_resource = function() {
			return '/'+this.bucketname+this.path;
		};
		this._canonicalized_amz_headers = function() {
			return 'x-amz-date:'+this.date;
		};
		this._url = function(strip_query) {
			var url = 'https://'+this.host+'/'+this.bucketname+this.path;
			if(strip_query) {
				return url;
			}
			var sep = '?';
			_.each(this.request_parameters, function(val, key) {
				url += sep + key + '=' + val;
				sep = '&';
			});
			return url;
		};
	}

	return function(endpoint, bucketname, key, secret) {
		return {
			endpoint: endpoint,
			bucketname: bucketname,
			key: key,
			secret: secret,

			list: function(prefix, async) {
				var req = new S3Request();
				req.host = endpoint;
				req.bucketname = this.bucketname;
				if(prefix) {
					req.request_parameters['prefix'] = prefix;
				}
				req.sign(this.key, secret);
				return req.make_request(async);
			},

			put: function(key, content, async) {
				var req = new S3Request();
				req.verb = 'PUT';
				req.host = endpoint;
				req.path = key;
				req.bucketname = this.bucketname;
				req.content = content;
				req.sign(this.key, secret);
				return req.make_request(async);
			},

			get: function(key, async) {
				var req = new S3Request();
				req.verb = 'GET';
				req.host = endpoint;
				req.path = key;
				req.bucketname = this.bucketname;
				req.content = content;
				req.sign(this.key, secret);
				return req.make_request(async);
			}
		}
	}
});
