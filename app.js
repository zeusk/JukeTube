(function() {
var template = document.querySelector('#t');

template.onSigninFailure = function(e, detail, sender) {
	this.isAuthenticated = false;
};

template.onSignedOut = function(e, detail, sender) {
	this.isAuthenticated = false;

	template.user = {
		name: null,
		email: null,
		profile: null
	};
}

template.onSigninSuccess = function(e, detail, sender) {
	this.isAuthenticated = true;

	if (template.users) {
		return;
	}

	this.gapi = e.detail.gapi;

	gapi.client.load('plus', 'v1').then(function() {

		// Get user's profile pic, cover image, email, and name.
		gapi.client.plus.people.get({userId: 'me'}).then(function(resp) {
			var PROFILE_IMAGE_SIZE = 75;
			var img = resp.result.image && resp.result.image.url.replace(/(.+)\?sz=\d\d/, "$1?sz=" + PROFILE_IMAGE_SIZE);

			template.user = {
				name: resp.result.displayName,
				email: resp.result.emails[0].value,
				profile: img || null
			};

			var users = {};

			getAllUserProfileImages(users, null, function(users) {
				template.users = users;
				template.users[template.user.name] = template.user.profile; // signed in user.
			});
		});
	});
};

template.isAuthenticated = true;

if (!navigator.onLine) {
	document.addEventListener('polymer-ready', function(e) {
		var ajax = document.createElement('core-ajax');
		ajax.auto = true;
		ajax.url = '/data/users.json';
		ajax.addEventListener('core-response', function(e) {
			template.users = e.detail.response;
		});
	});
}

})();

