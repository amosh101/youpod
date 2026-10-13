import assert from 'node:assert/strict';
import test from 'node:test';
import { parseVideoId } from '../src/youtube-player.js';

test('parses supported YouTube URL forms', () => {
  assert.equal(parseVideoId('https://youtu.be/JyDM9RB3Tec?si=share'), 'JyDM9RB3Tec');
  assert.equal(parseVideoId('https://www.youtube.com/watch?v=Fofi08x84dA'), 'Fofi08x84dA');
  assert.equal(parseVideoId('youtube.com/shorts/JyDM9RB3Tec'), 'JyDM9RB3Tec');
  assert.equal(parseVideoId('https://youtube.com/embed/Fofi08x84dA'), 'Fofi08x84dA');
  assert.equal(parseVideoId('JyDM9RB3Tec'), 'JyDM9RB3Tec');
});

test('rejects malformed IDs and non-YouTube URLs', () => {
  assert.equal(parseVideoId('https://example.com/watch?v=JyDM9RB3Tec'), null);
  assert.equal(parseVideoId('https://youtu.be/short'), null);
  assert.equal(parseVideoId(''), null);
  assert.equal(parseVideoId(null), null);
});
