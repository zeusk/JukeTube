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

template.onTubeReady = function(e, detail, sender) {
	document.querySelector('#gytube').scrollIntoView(false);
}

template.onTubeError = function(e, detail, sender) {
	var prompt = document.querySelector('#errorpd');
	if (prompt.opened != true) {
		prompt.toggle();
	}
}

template.onMenuSelect = function(e, detail, sender) {
	var idx = 0;
	var sel = parseInt(document.querySelector('#navmenu').selected);

	// Hide all but current tabs
	do {
		if (idx != sel) {
			document.querySelector('#Tab' + idx).style.display = 'none';
		}
	} while(++idx < 7);

	document.querySelector('#Tab' + sel).style.display = 'block';

	// This needs logged in google account
	if (sel == 4 && !this.isAuthenticated) {
		var prompt = document.querySelector('#loginpd');
		if (prompt.opened != true) {
			prompt.toggle();
		}
	} else {
		// Close drawer if in narrow mode
		var drw = document.querySelector('#drawerPanel');
		if (drw.narrow) {
			drw.closeDrawer();
		}

		// If on home, make sure video has prime estate on screen
		if (sel == 0) {
			document.querySelector('#gytube').scrollIntoView(false);
		}
	}
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
		});
	});
};

template.isAuthenticated = false;

})();

