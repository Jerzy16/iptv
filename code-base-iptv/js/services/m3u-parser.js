/**
 * Small M3U/M3U Plus parser for IPTV playlists.
 *
 * It intentionally keeps the parser independent from the DOM and from any
 * provider. Xtream playlists commonly put attributes on #EXTINF and the
 * stream URL on the following non-comment line.
 */
var M3UParser = (function () {
	var ATTRIBUTE_RE = /([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;

	function attributesFrom(line) {
		var attributes = {};
		var match;
		ATTRIBUTE_RE.lastIndex = 0;

		while ((match = ATTRIBUTE_RE.exec(line))) {
			attributes[match[1].toLowerCase()] = match[2] || match[3] || match[4] || '';
		}

		return attributes;
	}

	function nameFromExtInf(line, attributes) {
		var comma = line.indexOf(',');
		var name = comma === -1 ? '' : line.slice(comma + 1).trim();
		return name || attributes['tvg-name'] || 'Sin nombre';
	}

	function decodeNumericPlaylist(text) {
		var lines = String(text || '').trim().split(/\r?\n/);
		if (lines.length < 2) return text;

		for (var i = 0; i < lines.length; i++) {
			if (!/^\d{1,3}$/.test(lines[i].trim())) return text;
		}

		var decoded = '';
		for (var j = 0; j < lines.length; j++) {
			var code = parseInt(lines[j], 10);
			if (code < 0 || code > 255) return text;
			decoded += String.fromCharCode(code);
		}

		return decoded.indexOf('#EXT') === 0 ? decoded : text;
	}

	function parse(text) {
		var channels = [];
		var normalizedText = decodeNumericPlaylist(String(text || '').replace(/^\uFEFF/, ''));
		var lines = normalizedText.split(/\r?\n/);
		var pending = null;

		for (var i = 0; i < lines.length; i++) {
			var line = lines[i].trim();
			if (!line) continue;

			if (line.indexOf('#EXTINF:') === 0) {
				var attributes = attributesFrom(line);
				pending = {
					name: nameFromExtInf(line, attributes),
					tvgId: attributes['tvg-id'] || '',
					tvgName: attributes['tvg-name'] || '',
					tvgLogo: attributes['tvg-logo'] || '',
					groupTitle: attributes['group-title'] || ''
				};
				continue;
			}

			if (line.charAt(0) === '#') continue;
			if (!pending) continue;

			pending.url = line;
			channels.push(pending);
			pending = null;
		}

		return { channels: channels };
	}

	return { parse: parse, decode: decodeNumericPlaylist };
})();
