
var template = document.querySelector('#t');

var videoSnippets = [];
var videoPlayList = [];

var MenuIdxHome        = 0;
var MenuIdxNowPlaying  = 1;
var MenuIdxWhatToWatch = 2;
var MenuIdxHistory     = 3;
var MenuIdxWatchLater  = 4;
var MenuIdxSettings    = 5;
var MenuIdxNumberOf    = 6;

var SettingHideSideBarInFS = true;
var SettingAutoPlayNowPlay = true;

template.isAuthenticated = false;

window.onresize = function (event) {
	if (SettingHideSideBarInFS == true) {
		document.getElementById("drawerPanel").forceNarrow = ((screen.availHeight || screen.height-30) <= window.innerHeight);
	}
	if (parseInt(document.getElementById('navmenu').selected) == 0) {
		document.getElementById('gytube').scrollIntoView(false);
	}
}

function RemoveItem(e) {
	var id = e.id.substr(4);

	for (var i = videoPlayList.length - 1; i >= 0; i--) {
		if (videoPlayList[i] === id) {
			videoPlayList.splice(i, 1);
			break;
		}
	}

	document.getElementById(e.id).remove();
	document.getElementById(e.id + 'sp').remove();
	document.getElementById('toastItemRemove').show();
}

function InsertItem(e) {
	videoPlayList.push(e.id);
	document.getElementById('toastItemInsert').show();
}

function handleTubeState() {
	var yutube = document.getElementById('gytube');

	if (yutube.state == 0) {
		videoPlayList.shift();
		if (videoPlayList[0])
			yutube.videoid  = videoPlayList[0];
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
			populateTab(MenuIdxWatchLater, resp.result.items[0].contentDetails.relatedPlaylists.watchLater);
			populateTab(MenuIdxHistory, resp.result.items[0].contentDetails.relatedPlaylists.watchHistory);
		});

		var requestFeeds = gapi.client.youtube.activities.list({
			home: true,
			part: 'contentDetails'
		});
		requestFeeds.execute(function(resp) {
			populateTab(MenuIdxWhatToWatch, resp.result.items);
		});
	});

	this.isAuthenticated = true;
};

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

	$('#video-container' + MenuIdxWhatToWatch).html('');
	$('#video-container' + MenuIdxHistory).html('');
	$('#video-container' + MenuIdxWatchLater).html('');
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

template.onTubeState = function(e, detail, sender) {
	handleTubeState();
}

template.onMenuSelect = function(e, detail, sender) {
	var idx = 0;
	var sel = parseInt(document.querySelector('#navmenu').selected);

	do {
		if (idx != sel) {
			document.querySelector('#Tab' + idx).style.display = 'none';
		} else {
			document.querySelector('#Tab' + sel).style.display = 'block';
		}
	} while(++idx < MenuIdxNumberOf);

	if ((sel == MenuIdxWatchLater || sel == MenuIdxHistory || sel == MenuIdxWhatToWatch) && !this.isAuthenticated) {
		var prompt = document.querySelector('#loginpd');
		if (prompt.opened != true) {
			prompt.toggle();
		}
	} else {
		var drw = document.querySelector('#drawerPanel');
		if (drw.narrow) {
			drw.closeDrawer();
		}

		if (sel == MenuIdxHome) {
			var yutube = document.querySelector('#gytube');

			yutube.scrollIntoView(false);
			if (videoPlayList[0]) {
				if (yutube.videoid != videoPlayList[0]) {
					yutube.videoid  = videoPlayList[0];
				}
			}
		} else if (sel == MenuIdxNowPlaying) {
			populateTab(MenuIdxNowPlaying);
		} else if (sel == MenuIdxWhatToWatch) {
			var requestFeeds = gapi.client.youtube.activities.list({
				home: true,
				part: 'contentDetails'
			});
			requestFeeds.execute(function(resp) {
				populateTab(MenuIdxWhatToWatch, resp.result.items);
			});
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
				'<div id="' + videoId + '" onclick="InsertItem(this)" class="video" ' +
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

	if (tid == MenuIdxWhatToWatch) {
		$.each(playlistId, function(index, item) {
			var videoId;

			if (item.contentDetails.upload) {
				videoId = item.contentDetails.upload.videoId;
			} else if (item.contentDetails.like) {
				videoId = item.contentDetails.like.resourceId.videoId;
			} else if (item.contentDetails.recommendation) {
				videoId = item.contentDetails.recommendation.resourceId.videoId;
			}

			populateTabEx(MenuIdxWhatToWatch, videoId);
		});
	} else if (tid == MenuIdxNowPlaying) {
		$.each(videoPlayList, function(index, item) {
			obj = videoSnippets[item];
			console.log('populateTab: ' + item);
			$('#video-list' + MenuIdxNowPlaying).append(
				'<div id="nwpl' + item + '" onclick="RemoveItem(this)" class="video" ' +
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
				'</div><p id="nwpl' + item + 'sp" class="video-list-spacer">&nbsp;</p>'
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

