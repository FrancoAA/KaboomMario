import kaboom from "kaboom"
import "kaboom/global"

// initialize context
kaboom({
  height: 600,
  width: 800,
  background: [0, 0, 0]
})

// load assets
loadRoot('sprites/');
loadSprite('block', 'block.png');
loadSprite('brick', 'brick.png');
loadSprite('coin', 'coin.png');
loadSprite('question', 'question.png');
loadSprite('unboxed', 'unboxed.png');
loadSprite('pipe-left', 'pipe-left.png');
loadSprite('pipe-right', 'pipe-right.png');
loadSprite('pipe-top-left-side', 'pipe-top-left-side.png');
loadSprite('pipe-top-right-side', 'pipe-top-right-side.png');
loadSprite('evil-shroom-1', 'evil-shroom-1.png');
loadSprite('mushroom', 'mushroom.png');
loadSprite('mario-standing', 'mario-standing.png');


const map = [
  '                                        ',
  '                                        ',
  '                                        ',
  '                                        ',
  '                                        ',
  '                                        ',
  '      %  =*=%                           ',
  '                                        ',
  '                                        ',
  '            -+             -+           ',
  '            ()      ^   ^  ()           ',
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxx    xxxxxxx',
];

const MOVE_SPEED = 120;
const JUMP_FORCE = 200;
const MUSHROOM_SPEED = MOVE_SPEED * 0.75;
const ENEMY_MUSHROOM = MOVE_SPEED * 0.5;
const FALL_DEATH = 600;

// custom component controlling enemy patrol movement
function patrol(speed = 60, dir = 1) {
  return {
    id: "patrol",
    require: ["pos", "area"],
    add() {
      this.on("collide", (obj, col) => {
        if (col.isLeft() || col.isRight()) {
          dir = -dir
        }
      })
    },
    update() {
      this.move(speed * dir, 0)
    },
  }
}

// custom component that makes stuff grow big
function big() {
  let isBig = false
  let destScale = 1
  return {
    // component id / name
    id: "big",
    // it requires the scale component
    require: ["scale"],
    // this runs every frame
    update() {
      this.scale = this.scale.lerp(vec2(destScale), dt() * 6)
    },
    // custom methods
    isBig() {
      return isBig
    },
    smallify() {
      destScale = 1
      isBig = false
    },
    biggify() {
      destScale = 2
      isBig = true
    },
  }
}

setGravity(2000);

const game = scene('game', () => {
  const level = addLevel(map, {
    tileWidth: 20,
    tileHeight: 20,
    tiles: {
      '=': () => [
        sprite('block'),
        area(),
        body({ isStatic: true }),
      ],
      'x': () => [
        sprite('brick'),
        area(),
        body({ isStatic: true }),
      ],
      '%': () => [
        sprite('question'),
        area(),
        body({ isStatic: true }),
        'coin-surprise',
        'box'
      ],
      '*': () => [
        sprite('question'),
        area(),
        body({ isStatic: true }),
        'mushroom-surprise',
        'box'
      ],
      '}': () => [
        sprite('unboxed'),
        area(),
        body({ isStatic: true })
      ],
      '(': () => [
        sprite('pipe-left'),
        scale(0.5),
        area(),
        body({ isStatic: true }),
      ],
      ')': () => [
        sprite('pipe-right'),
        scale(0.5),
        area(),
        body({ isStatic: true }),
      ],
      '-': () => [
        sprite('pipe-top-left-side'),
        scale(0.5),
        area(),
        body({ isStatic: true }),
        'pipe',
      ],
      '+': () => [
        sprite('pipe-top-right-side'),
        scale(0.5),
        area(),
        body({ isStatic: true }),
        'pipe',
      ],
      '^': () => [
        sprite('evil-shroom-1'),
        area(),
        body(),
        patrol(ENEMY_MUSHROOM, -1),
        'evil-shroom',
      ]
    }
  });

  const ui = add([
  ]);

  const score = ui.add([
    text('Score: 0', { size: 14 }),
    pos(20, 6),
    fixed(),
    {
      value: 0
    }
  ]);

  const world = ui.add([
    text('Level 0', { size: 14 }),
    pos(width() - 20, 6),
    anchor('topright'),
    fixed(),
  ]);

  const player = add([
    sprite('mario-standing'),
    pos(30, 0),
    area(),
    body(),
    big(),
    scale(1),
    'player'
  ]);

  function spawnSurprise(obj) {
    if (obj.is('coin-surprise')) {
      add([
        sprite('coin'),
        pos(obj.pos.sub(0, 20)),
        area(),
        'coin'
      ]);
    }
    else if (obj.is('mushroom-surprise')) {
      add([
        sprite('mushroom'),
        pos(obj.pos.sub(0, 20)),
        area(),
        body(),
        offscreen({ destroy: true }),
        patrol(MUSHROOM_SPEED),
        'mushroom',
      ]);
    }

    destroy(obj);

    add([
      sprite('unboxed'),
      area(),
      body({ isStatic: true }),
      pos(obj.pos.sub(0, 0))
    ]);
  }

  onKeyDown('left', () => {
    player.move(-MOVE_SPEED, 0);
  });
  onKeyDown('right', () => {
    player.move(MOVE_SPEED, 0);
  });
  onKeyDown('space', () => {
    if (!player.isGrounded()) return;
    player.jump();
  });

  player.onUpdate(() => {
    camPos(player.pos);
    if (player.pos.y >= FALL_DEATH) {
      go('gameover', { score: score.value });
    }
  });

  player.onHeadbutt((obj) => {
    if (obj.is('box')) spawnSurprise(obj);
  });

  player.onCollide('evil-shroom', (e, c) => {
    if (c?.isBottom()) {
      destroy(e);
      score.value += 10;
      score.text = 'score: ' + score.value;
    }
    else {
      if (player.isBig()) {
        player.smallify();
        return;
      }
      go('gameover', { score: score.value });
    }
  });

  player.onCollide('mushroom', (m) => {
    destroy(m);
    player.biggify();
  });

  player.onCollide('coin', (c) => {
    destroy(c);
    score.value += 10;
    score.text = 'score: ' + score.value;
  });

  onKeyPress('r', () => go('game'));
});

scene('gameover', (args) => {
  add([
    text(`Game Over!\nYour score: ${args.score}\nRestart? [r]`, { align: 'center' }),
    anchor('center'),
    pos(center())
  ]);
  onKeyPress('r', () => go('game'));
});

go('game');
