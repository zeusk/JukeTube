var template = document.querySelector('#t');
var videoSnippets = [];
var videoPlayList = [];

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

template.onMenuActivate = function(e, datail, sender) {
	var sel = parseInt(document.querySelector('#navmenu').selected);

	// Get new recommendations
	if (sel == 2) {
		var requestFeeds = gapi.client.youtube.activities.list({
			home: true,
			part: 'contentDetails'
		});
		requestFeeds.execute(function(resp) {
			populateTab(2, resp.result.items);
		});
	}
}

function queueItem(e) {
	videoPlayList.push(e.id);
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
		} else if (sel == 3) {
			populateTab(3);
		}
	}
}

function populateTabEx(tid, videoId) {
	var requestVideo = gapi.client.youtube.videos.list({
		id: videoId,
		part: 'snippet'
	});

	requestVideo.execute(function(resp) {
		if (!resp.result.items[0]) {
			return;
		}
		if (!!!document.getElementById(videoId)) {
			$('#video-list'+tid).append(
				'<div id="' + videoId + '" onclick="queueItem(this)" class="video" ' +
					'title="' + resp.result.items[0].snippet.title + '">' +
					'<img class="video-image" src="' +
						resp.result.items[0].snippet.thumbnails.medium.url +
					'" height=156px width=auto></img>' +
					'<p class="video-title">' +
						resp.result.items[0].snippet.title +
					'</p>' +
					'<p class="video-author">' +
						resp.result.items[0].snippet.channelTitle +
					'</p>' +
					'<p class="video-description">' +
						resp.result.items[0].snippet.description.trunc(448, true) +
					'</p>' +
				'</div><p class="video-list-spacer">&nbsp;</p>'
			);

			videoSnippets[videoId] = resp.result.items[0];
		}
	});
}

function populateTab(tid, playlistId, pageToken) {
	$('#video-container'+tid).html('<div id="video-list' + tid + '" class="video-list"></div>');

	// Recommendation response contains array of videoIds instead of a playlistId
	if (tid == 2) {
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
	} else if (tid == 3) {
		$.each(videoPlayList, function(index, item) {
			obj = videoSnippets[item];

			$('#video-list3').append(
				'<div id="' + item + '" onclick={{queueItem}} class="video" ' +
					'title="' + obj.snippet.title + '">' +
					'<img class="video-image" src="' +
						obj.snippet.thumbnails.medium.url +
					'" height=156px width=auto></img>' +
					'<p class="video-title">' +
						obj.snippet.title +
					'</p>' +
					'<p class="video-author">' +
						obj.snippet.channelTitle +
					'</p>' +
					'<p class="video-description">' +
						obj.snippet.description.trunc(448, true) +
					'</p>' +
				'</div><p class="video-list-spacer">&nbsp;</p>'
			);
		});
	} else {
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
			$.each(playlistItems, function(index, item) {
				populateTabEx(tid, item.snippet.resourceId.videoId);
			});
		});
	}
}

template.onSigninSuccess = function(e, detail, sender) {
	this.gapi = e.detail.gapi;

	gapi.client.load('plus', 'v1').then(function() {
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

	this.isAuthenticated = true;
};
template.isAuthenticated = false;

