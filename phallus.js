var irc = require('irc');
var sqlite3 = require('sqlite3');

var db = new sqlite3.Database('db.sqlite3');
db.run(`CREATE TABLE IF NOT EXISTS hunters (
	nick TEXT UNIQUE,
	chan TEXT,
	succ INTEGER,
	cutt INTEGER
)`);
db.run(`CREATE TABLE IF NOT EXISTS hunter_times (
	nick TEXT,
	chan TEXT,
	time INTEGER
)`);

const nick = 'phallus';
var client = new irc.Client('irc.snoonet.org', nick, {
	userName: 'phallus',
	realName: 'Biggus Phallus',
	port: 6697,
	debug: true,
	secure: true,
	channels: ['#gnulag']
});

var hunt_states = {};
const funcmap = {
	'succ': do_succ,
	'cutt': do_cutt,
	'%suckers': show_suckers,
	'%succers': show_suckers,
	'%cutters': show_cutters,
	'%dicks': show_dicks
};

client.addListener('message', handle_message);
client.addListener('registered', function() {
	client.say('nickserv', 'identify vini honeybear');
});
client.addListener('invite', function(chan, from, msg) {
	client.join(chan);
});
client.addListener('join', function(chan, who, msg) {
	if (who == nick) {
		hunt_states[chan] = {
			dick_sent: false,
			score: sender_initial_score(),
			last_kill_epoch: Date.now()/1000,
			sent_epoch: 0
		};
	}
});

function handle_message(from, chan, msg) {
	hunt_states[chan].score++;
	let first_word = msg.split(' ')[0];
	if (funcmap[first_word]) {
		funcmap[first_word](from, chan, msg);
	}
}

function do_succ(nick, chan) {
	handle_action(nick, chan, 'succ');
}

function do_cutt(nick, chan) {
	handle_action(nick, chan, 'cutt');
}

function handle_action(nick, chan, action) {
	if (!hunt_states[chan].dick_sent) {
		var reply = 'There\'s no dick, what are you trying to ' + action + '?';
		client.say(chan, reply);
		return;
	}

	hunt_states[chan].dick_sent = false;
	hunt_states[chan].last_kill_epoch = Date.now()/1000;
	const time = Date.now()/1000 - hunt_states[chan].sent_epoch;

	db.get('SELECT COUNT(*) as count FROM hunters WHERE nick = ? AND chan = ?', nick, chan,
		function(err, row) {
			if (err)
				console.log(err);
			if (row.count > 0)
				db.run('UPDATE hunters SET ' + action +
					' = ' + action + ' + 1 WHERE nick = ? AND chan = ?', nick, chan);
			else
				db.run('INSERT INTO hunters VALUES (?, ?, ?, ?)',
					nick, chan, action == 'succ', action == 'cutt');
			db.run('INSERT INTO hunter_times VALUES (?, ?, ?)', nick, chan, time);
			db.get('SELECT succ, cutt FROM hunters WHERE nick = ? AND chan = ?', nick, chan,
			function(err, row) {
				if (err)
					console.log(err);
					if (action == 'succ')
					client.say(chan,
						'You sucked that dick in ' + time +
						' seconds. You\'ve sucked ' + row.succ +
						' dicks in ' + chan + '.'
					);
				else
					client.say(chan,
						'You cut that dick in ' + time +
						'seconds. You\'ve cut ' + row.cutt +
						'dicks in ' + chan + '.'
					);
			});
		});
}

function show_suckers(nick, chan) {
	show_top(chan, 'succ');
}

function show_cutters(nick, chan) {
	show_top(chan, 'cutt');
}

function show_top(chan, action) {
	db.all('SELECT nick, ' + action + ` FROM hunters
		WHERE chan = ? AND ` + action + ` > 0
		ORDER BY ` + action + ` DESC
		LIMIT 10`, chan,
		function(err, rows) {
			if (err)
				console.log(err);
			if (!rows)
				client.say(chan, '*crickets*');
			var name;
			if (action == 'succ')
				name = 'suckers';
			else
				name = 'cutters';

			var str = 'Best ' + name + ' in ' + chan + ': ';
			for (var i in rows) {
				str += rows[i].nick + ': ' + rows[i][action];
				if (i < rows.length - 1)
					str += ' | ';
			}

			client.say(chan, str);
		});
}

function show_dicks(sender, chan, msg) {
	var nick = msg.split(' ')[1];
	if (!nick)
		nick = sender;

	db.get(`SELECT succ, cutt,
		(SELECT AVG(time) FROM hunter_times WHERE nick = ? AND chan = ?) as average
		FROM hunters where nick = ? and chan = ?`, nick, chan, nick, chan,
		function(err, row) {
			if (err)
				console.log(err);
			if (row)
				client.say(chan, nick + ', you\'ve sucked ' + row.succ +
					' dicks and cut ' + row.cutt + ' dicks with an average of ' +
					row.average + ' seconds per dick in ' + chan + '.');
			else
				client.say(chan, nick + ' hasn\'t participated in the dickhunt.');
		});
}

function sched() {
	for (var key in hunt_states) {
		if (!hunt_states[key].dick_sent && sender_ready(hunt_states[key])) {
			send_dick(key);
		}
	}
}

function randitem(a) {
	return a[Math.floor(Math.random() * a.length)];
}

const dick = {
	balls: [ '8', 'B', 'O', 'Q', 'C', 'E', '@' ],
	shafts: [ ['#', 10], ['~', 12], ['-', 15], [':', 17], ['=', 8] ],
	tips: [ 'D', 'o', '\xb7' ],
	cumming: [ '*spurt* *spurt*', '*SPLORT*', '*splash* *splash*' ],
	big: [ '*THONK*', '*SHLYUP*', '*SLAP*', '*SHLONK*', '*taps on your shoulder*' ],
	small: [ 'OwO', '*blushes*', 'hi...', '*hugs*' ],
	weird: [ '*flap* *flap*', 'AAAAAAAAAAAAAAAAAAA', '*SSSSSSSSSSSSSSS*' ],
	generic: [ '*slap* *slap*', '*rubs*' ],
}

function gen_dick() {
	const balls = randitem(dick.balls);
	const shafttype = randitem(dick.shafts);
	const tip = randitem(dick.tips);

	const shaftcomp = shafttype[0];
	const shaftlen = Math.ceil(Math.random() * shafttype[1]);

	const cumropes = Math.floor(Math.random() * 3);
	const cumming = (cumropes > 0 && shaftcomp != '~');

	var d = '';
	d += balls;
	for (i = 0; i < shaftlen; i++)
		d += shaftcomp;

	d += tip;

	var cumlen = 0;
	if (cumming) {
		if (Math.floor(Math.random() * 2) == 1)
			d += ' ';

		for (var i = 0; i < cumropes; i++) {
			if (Math.ceil(shaftlen/2) <= 2)
				cumlen = 1;
			else
				cumlen = Math.floor(Math.random() * Math.ceil(shaftlen/2));

			for (var j = 0; j < cumlen; j++)
				d += '~';

			d += ' ';
		}
	} else {
		d += ' ';
	}

	if (shaftlen < 4)
		d += randitem(dick.small);
	else if (shaftlen >= 8 && shaftcomp == '~' || shaftcomp == '-')
		d += randitem(dick.weird);
	else if (shaftlen >= 8)
		d += randitem(dick.big);
	else if (cumming)
		d += randitem(dick.cumming);
	else
		d += randitem(dick.generic);

	return d;
}

function send_dick(chan) {
	hunt_states[chan].dick_sent = true;
	hunt_states[chan].sent_epoch = Date.now()/1000;
	client.say(chan, gen_dick());
}

function sender_initial_score() {
	return Math.floor(Math.random() * 25);
}

function sender_ready(state) {
	const x = state.score;
	const t = Date.now()/1000 - state.last_kill_epoch;
	const xmin = 25;
	const xmax = 125;
	const tmin = 1200; // min 20 minutes
	const tmax = 10800; // max 3 hours

	if (x < xmin || t < tmin) {
		return false;
	} else {
		let k = sender_func(x, xmin, xmax, tmin, tmax);
		return t > k;
	}
}

function sender_func(x, xmin, xmax, tmin, tmax) {
	const k = xmax / Math.sqrt(xmax - xmin);
	return (-k * x) + tmax;
}

setInterval(sched, 5000);
