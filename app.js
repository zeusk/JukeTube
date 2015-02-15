(function() {

var template = document.querySelector('#t');

template.onSigninFailure = function(e, detail, sender) {
	this.isAuthenticated = false;
};

template.onSignedOut = function(e, detail, sender) {
	this.isAuthenticated = false;

	// Clear user info
	template.user = {
		name: null,
		email: null,
		profile: null
	};

	// Clear user lists
	$('#video-container2').html('');
	$('#video-container4').html('');
	$('#video-container5').html('');
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
	} while(++idx < 8);

	document.querySelector('#Tab' + sel).style.display = 'block';

	if ((sel == 5 || sel == 4 || sel == 2) && !this.isAuthenticated) {
		// These tabs require google account authentication
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

function populateTabExAppend(tid, title, videoId) {
	$('#video-container'+tid).append('<p>' + title + ' - ' + videoId + '</p>');
}

function populateTabEx(tid, videoId) {
	var requestVideo = gapi.client.youtube.videos.list({
		id: videoId,
		part: 'snippet'
	});
	requestVideo.execute(function(resp) {
		populateTabExAppend(tid, resp.result.items[0].snippet.title, videoId);
	});
}

function populateTab(tid, playlistId, pageToken) {
	$('#video-container'+tid).html('');

	// Recommendation response contains array of videoIds instead of a playlistId
	if (tid == 2) {
		if (playlistId) {
			$.each(playlistId, function(index, item) {
				var videoId;

				if (item.contentDetails.upload) {
					videoId = item.contentDetails.upload.videoId;
				} else if (item.contentDetails.like) {
					videoId = item.contentDetails.like.resourceId.videoId;
				} else if (item.contentDetails.recommendation) {
					videoId = item.contentDetails.recommendation.resourceId.videoId;
				}

				populateTabEx(2, videoId);
			});
		} else {
			$('#video-container2').html('Youtube does not have any recommendations for you :(');
		}
		return;
	}

	var requestOptions = {
		playlistId: playlistId,
		part: 'snippet',
		maxResults: 10
	};
	if (pageToken) {
		requestOptions.pageToken = pageToken;
	}
	var request = gapi.client.youtube.playlistItems.list(requestOptions);
	request.execute(function(response) {
		var playlistItems = response.result.items;
		if (playlistItems) {
			$.each(playlistItems, function(index, item) {
				populateTabEx(tid, item.snippet.resourceId.videoId);
			});
		} else {
			$('#video-container'+tid).html('You do not have any videos in this list.');
		}
	});
}

template.onSigninSuccess = function(e, detail, sender) {
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

		/*
		 * My first google-API based app, got struck by a known bug already!
		 *
		 * API v3 Watch History returns empty erratically
		 * https://code.google.com/p/gdata-issues/issues/detail?id=4642
		 */
		gapi.client.load('youtube', 'v3', function() {
				var requestLists = gapi.client.youtube.channels.list({
					mine: true,
					part: 'contentDetails'
				});
				requestLists.execute(function(resp) {
					populateTab(5, resp.result.items[0].contentDetails.relatedPlaylists.watchLater);
					populateTab(4, resp.result.items[0].contentDetails.relatedPlaylists.watchHistory);
				});

				var requestFeeds = gapi.client.youtube.activities.list({
					home: true,
					part: 'contentDetails'
				});
				requestFeeds.execute(function(resp) {
					populateTab(2, resp.result.items);
				});
			});
	});

	this.isAuthenticated = true;
};

template.isAuthenticated = false;

})();

