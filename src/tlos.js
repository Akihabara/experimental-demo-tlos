// ---
// Copyright (c) 2010 Francesco Cottone, http://www.kesiev.com/
// ---


// Game-specific

var audioserver;
var maingame;
var noface; // Is a fake "actor" in dialogues. The text is ever in the same place.
var tilemaps={}, dialogues={}, credits={};

// In games like Zelda, object are alive also outside of the screen.
// So, let's calculate a distance threshold from the camera
function objectIsAlive(th) {
	return AkihabaraTrigo.getDistance(th,AkihabaraGamebox.getCamera())<800;
}

function go() {
	AkihabaraGamebox.setGroups(["background","player","bonus","foes","walls","playerbullets","foesbullets","sparks","foreground","gamecycle"]);
	AkihabaraAudio.setAudioChannels({bgmusic:{volume:0.8},sfx:{volume:1.0}});

	// player, walls, bullets and foes are under z-index layer
	AkihabaraGamebox.setRenderOrder(["background",AkihabaraGamebox.ZINDEX_LAYER,"sparks","foreground","gamecycle"]);

	maingame=AkihabaraGamecycle.createMaingame("gamecycle","gamecycle");

	// Title intro
	maingame.gameTitleIntroAnimation=function(reset) {
		if (reset) {
			AkihabaraAudio.playAudio("default-music");
			AkihabaraToys.resetToy(this,"rising");
		} else {
			AkihabaraGamebox.blitFade(AkihabaraGamebox.getBufferContext(),{alpha:1,color:"rgb(150,150,150)"});
			AkihabaraToys.logos.rising(this,"rising",{image:"logo",x:AkihabaraGamebox.getScreenHW()-AkihabaraGamebox.getImage("logo").hwidth,y:20,speed:1,gapx:250,reflex:0.1,audioreach:"coin"});
		}
	},

	// No level intro animation
	maingame.gameIntroAnimation=function() { return true; }

	// No end level animation
	maingame.endlevelIntroAnimation=function() { return true; }

	// Level animation
	maingame.levelIntroAnimation=function(reset) {
		if (reset) {
			AkihabaraToys.resetToy(this,"default-blinker");
		} else {
			AkihabaraGamebox.blitFade(AkihabaraGamebox.getBufferContext(),{alpha:1});
			return AkihabaraToys.text.fixed(this,"default-blinker",AkihabaraGamebox.getBufferContext(),{font:"big",text:maingame.getNextLevel().label,valign:AkihabaraGamebox.ALIGN_MIDDLE,halign:AkihabaraGamebox.ALIGN_CENTER,dx:0,dy:0,dw:AkihabaraGamebox.getScreenW(),dh:AkihabaraGamebox.getScreenH(),time:50});
		}
	}

	// Game is ever over, if the player dies the first time. No life check, since is energy-based.
	maingame.gameIsOver=function() { return true; }

	// Game ending
	maingame.gameEndingIntroAnimation=function(reset){
		if (reset) {
			AkihabaraToys.resetToy(this,"intro-animation");
		} else {
			AkihabaraGamebox.blitFade(AkihabaraGamebox.getBufferContext(),{alpha:1});
			return AkihabaraToys.dialogue.render(this,"intro-animation",credits.titles);
		}
	}

	// Game events are decided by the map.
	maingame.gameEvents=function() {
		tilemaps.map.mapActions();
	}

	// Change level
	maingame.changeLevel=function(level) {
		// Cleanup the level
		AkihabaraGamebox.trashGroup("playerbullets");
		AkihabaraGamebox.trashGroup("foesbullets");
		AkihabaraGamebox.trashGroup("foes");
		AkihabaraGamebox.trashGroup("bonus");
		AkihabaraGamebox.trashGroup("walls");
		AkihabaraGamebox.purgeGarbage(); // Since we're starting, we can purge all now

		if (level==null)
			level={level:"begin",x:300,y:270,introdialogue:true}; // First stage

		// Dialogues are emptied - will be loaded by bundles. Cache is not needed - each bundle
		// Contains full dialogues for the floor.
		dialogues={};

		// Map data is wiped too. Will be loaded by loadBundle. Other data in tilemaps is
		// kept (i.e. quest status etc)
		delete tilemaps.map;

		// Here the map is loaded. During the load time, the game is still.
		AkihabaraGamebox.addBundle({
			file:"resources/bundle-map-"+level.level+".js",
			onLoad:function(){ // This "onload" operation is triggered after everything is loaded.
				AkihabaraTile.finalizeTilemap(tilemaps.map); // Finalize the map into the bundle
				AkihabaraGamebox.createCanvas("tileslayer",{w:tilemaps.map.w,h:tilemaps.map.h}); // Prepare map's canvas
				AkihabaraGamebox.blitTilemap(AkihabaraGamebox.getCanvasContext("tileslayer"),tilemaps.map); // Render map on the canvas
				AkihabaraTopview.spawn(AkihabaraGamebox.getObject("player","player"),{x:level.x,y:level.y}); // Displace player
				tilemaps.map.addObjects(); // Initialize map
				if (level.introdialogue) // Eventually starts intro dialogue.
			maingame.startDialogue("intro"); // game introduction, if needed
			}
		});
	}

	// Game initialization
	maingame.initializeGame=function() {
		// Prepare hud
		maingame.hud.setWidget("weapon",{widget:"radio",value:0,tileset:"items",frames:[0],dx:10,dy:10});
		maingame.hud.setWidget("health",{widget:"symbols",tiles:[3,2,1,0],minvalue:0,maxvalue:20,value:12-(maingame.difficulty*4),maxshown:4,tileset:"hud",emptytile:4,dx:40,dy:10,gapx:20,gapy:0});
		maingame.hud.setWidget("cash",{widget:"label",font:"small",value:0,minvalue:0,maxvalue:100,dx:AkihabaraGamebox.getScreenW()-60,dy:AkihabaraGamebox.getScreenH()-24,prepad:3,padwith:" ",clear:true});
		maingame.hud.setWidget("SMALLKEY",{widget:"label",font:"small",value:0,minvalue:0,maxvalue:999,dx:AkihabaraGamebox.getScreenW()-60,dy:AkihabaraGamebox.getScreenH()-43,prepad:3,padwith:" ",clear:true});
		maingame.hud.setWidget("BOSSKEY",{widget:"bool",value:0,tileset:"hud",frame:5,dx:AkihabaraGamebox.getScreenW()-30,dy:AkihabaraGamebox.getScreenH()-66}); // This is shown if value is true or >0

		maingame.hud.setWidget("lblkey",{widget:"blit",value:6,tileset:"hud",dx:AkihabaraGamebox.getScreenW()-30,dy:AkihabaraGamebox.getScreenH()-50});
		maingame.hud.setWidget("lblcoin",{widget:"blit",value:7,tileset:"hud",dx:AkihabaraGamebox.getScreenW()-30,dy:AkihabaraGamebox.getScreenH()-30});

		tilemaps={
			_defaultblock:100, // The block that is over the borders (a wall)
			queststatus:{} // Every step the player does, is marked here (opened doors, sections cleared etc)
		};

		AkihabaraGamebox.addObject({
			id:"bg",
			group:"background",
			blit:function() {
				AkihabaraGamebox.centerCamera(AkihabaraGamebox.getObject("player","player"),{w:tilemaps.map.w,h:tilemaps.map.h});
				AkihabaraGamebox.blit(AkihabaraGamebox.getBufferContext(),AkihabaraGamebox.getCanvas("tileslayer"),{dx:0,dy:0,dw:AkihabaraGamebox.getScreenW(),dh:AkihabaraGamebox.getScreenH(),sourcecamera:true});
			}
		});

		AkihabaraGamebox.addObject(new Player());
	};

	// Add a bonus item. It jumps a while and then disappear.
	maingame.addBonus=function(x,y,type,id,expire) {
		var frames;

		switch (type) {
			case "coin": {frames={ standdown:{ speed:2, frames:[0,1,2,3,4,5] }  }; break } // Rotating coin
			case "arrow": {frames={ standdown:{ speed:3, frames:[6,7] }  }; break } // Blinking arrow icon
			case "SMALLKEY": {frames={ standdown:{ speed:3, frames:[8,9] }  }; break } // Blinking small key
			case "BOSSKEY": {frames={ standdown:{ speed:3, frames:[10,11] }  }; break } // Blinking small key
		}

		AkihabaraGamebox.addObject(new Bonus(x,y,type,id,expire, frames));
	}

	// Changes a tile in the map. It also adds smoke if asked.
	maingame.setTileInMap=function(x,y,tile,smoke) {
		AkihabaraTile.setTileInMap(AkihabaraGamebox.getCanvasContext("tileslayer"),tilemaps.map,x,y,tile);
		if (smoke) {
			var ts=AkihabaraGamebox.getTiles(tilemaps.map.tileset);
			AkihabaraAudio.hitAudio("explosion"); // Switch sound
			maingame.addSmoke({x:x*ts.tilew,y:y*ts.tilew,h:ts.tileh,w:ts.tilew,hh:ts.tilehh,hw:ts.tilehw,camera:true});
		}
	}

	// Add the "QUEST CLEAR" message
	maingame.addQuestClear=function(msg) {
		if (msg==null) AkihabaraAudio.hitAudio("default-menu-confirm"); // Switch sound
		AkihabaraToys.generate.sparks.popupText(AkihabaraGamebox.getObject("player","player"),"sparks",null,{font:"big",jump:6,text:(msg==null?"QUEST CLEAR!":msg),keep:20});
	}

	// Add spreading smoke on an object
	maingame.addSmoke=function(ob,color) {
		// Since camera is not specified (will be into the initializator), is added on the spark instead from the created object
		AkihabaraToys.generate.sparks.simple(ob,"sparks",null,{camera:true,animspeed:2,accy:-3,accx:-3,tileset:(color==null?"flame-white":color)});
		AkihabaraToys.generate.sparks.simple(ob,"sparks",null,{camera:true,animspeed:2,accy:-3,accx:3,tileset:(color==null?"flame-white":color)});
		AkihabaraToys.generate.sparks.simple(ob,"sparks",null,{camera:true,animspeed:2,accy:3,accx:-3,tileset:(color==null?"flame-white":color)});
		AkihabaraToys.generate.sparks.simple(ob,"sparks",null,{camera:true,animspeed:2,accy:3,accx:3,tileset:(color==null?"flame-white":color)});
	}

	// Add a tresaure chest
	maingame.addChest=function(x,y,id,animated,cont,contid,expi) {
		var td=AkihabaraGamebox.getTiles(tilemaps.map.tileset);
		var ob=AkihabaraGamebox.addObject(new Chest(x,y,id,animated,cont,contid,expi,td));
		if (animated) maingame.addSmoke(ob);
	}

	// Add a door
	maingame.addDoor=function(id,tileset,x,y,animated,openwith) { // A door constructor. These doors opens shaking and smoking, a la Zelda
		var door=AkihabaraTopview.makedoor("walls",id,tilemaps.map,{whileMoving:function(){
			this.x+=(this.opencounter%2==0?-1:1)
			if (this.opencounter%5==0) {
				AkihabaraToys.generate.sparks.simple(this,"sparks",null,{alpha:0.7,gapy:this.hh,frames:{speed:4,frames:[3,2,1,2,3]},accy:-AkihabaraHelpers.random(0,4),tileset:"flame-white"});
				AkihabaraToys.generate.sparks.simple(this,"sparks",null,{alpha:0.7,gapx:-this.hw/2,gapy:this.hh,frames:{speed:4,frames:[3,2,1,2,3]},accy:-AkihabaraHelpers.random(0,4),accx:-1,tileset:"flame-white"});
				AkihabaraToys.generate.sparks.simple(this,"sparks",null,{alpha:0.7,gapx:this.hw/2,gapy:this.hh,frames:{speed:4,frames:[3,2,1,2,3]},accy:-AkihabaraHelpers.random(0,4),accx:1,tileset:"flame-white"});
			}
		},whenClosed:function() {
			this.x++; // Place the door in the right position
		},questid:id,openwith:openwith,closing:animated,doorheight:50,fullhit:true,tilex:x,tiley:y,tileset:tileset,audiobefore:"explosion",audioafter:"megaexplosion",frames:{speed:1,frames:[0]}});
		if (openwith) {
			door.doPlayerAction=function(by) { // When used
				if (maingame.hud.getValue(this.openwith,"value")>0) {
					if (this.questid!=null) tilemaps.queststatus[this.questid]=true; // Mark this door as opened
					maingame.hud.addValue(this.openwith,"value",-1);
					this.doOpen();
					AkihabaraAudio.hitAudio("default-menu-confirm");
					maingame.addQuestClear(openwith+" USED");
				} else {
					AkihabaraAudio.hitAudio("beepbad");
					maingame.addQuestClear("NEEDS "+openwith);
				}
			}
		}
	}

	// Starts a dialogue
	maingame.startDialogue=function(id,pause) {
		if ((maingame.difficulty==0)||(!dialogues[id].istutorial)) { // dialogues marked as tutorial are shown only on easy. This flag is in the dialogue itself.
			AkihabaraGamebox.addObject({
				group:"foreground",
				id:"dialogue",
				dialogueToRead:id,
				pause:1+(pause==null?0:1), // Pauses a dialog for a while. Is important to wait a frame very time to cancel the last "b" key press (for interacting, for example)
				initialize:function() {
					AkihabaraGamebox.getObject("player","player").doPause(true); // First pause the player
				},
				blit:function() {
					if (this.pause)
						this.pause--;
					else if (AkihabaraToys.dialogue.render(this,"dialogue",dialogues[this.dialogueToRead])) { // If the dialogue is ended
						if (dialogues[this.dialogueToRead].endgame) // If the dialogue is marked by "endgame"...
							maingame.gameIsCompleted(); // The game is completed
						else
							AkihabaraGamebox.getObject("player","player").doPause(false); // Unpause the player
							AkihabaraGamebox.trashObject(this); // Trash the dialogue itself.
						}
					}
			});
		}
	}

	// Add a still object. Are sprites that supports the z-index (houses, trees.) You can walk around these objects
	maingame.addBlock=function(x,y,tileset,frame) {
		AkihabaraGamebox.addObject({
			group:"walls",
			tileset:tileset,
			zindex:0, // Needed for zindexed objects
			x:x,
			y:y,
			frame:frame,

			initialize:function() {
				AkihabaraTopview.initialize(this); // Any particular initialization. Just the auto z-index
			},

			blit:function() {
				if (AkihabaraGamebox.objectIsVisible(this)) {
					// Then the object. Notes that the y is y-z to have the "over the floor" effect.
					AkihabaraGamebox.blitTile(AkihabaraGamebox.getBufferContext(),{tileset:this.tileset,tile:this.frame,dx:this.x,dy:this.y+this.z,camera:this.camera,fliph:this.fliph,flipv:this.flipv});
				}
			}
		});
	}

	// Add a npc (Not Playing Charachter)
	maingame.addNpc=function(x,y,still,dialogue,questid,talking,silence) {
		// An easy way to create an NPC.
		AkihabaraGamebox.addObject(new Npc(x,y,still,dialogue,questid,talking,silence));
	}

	// Add an enemy
	maingame.addEnemy=function(id,type,x,y,cloud) {
		var enemy=AkihabaraGamebox.addObject(new Enemy(id,type,x,y,cloud));
		if (cloud) maingame.addSmoke(enemy,"flame-blue");
		return enemy;
	}
	AkihabaraGamebox.go();
}

// BOOTSTRAP
AkihabaraGamebox.onLoad(function () {
	Akihabara.createNewGame({
		title: "The Legend Of Sadness",
		splash: {
			footnotes:[
				"Musics by: Greenleo, Graulund, Robert Jaret.",
				"Full credits on ending title."
			]
		}
	});

	// We are not going to use faces for dialogues
	noface={ noone:{ x:10, y:170,box:{x:0,y:160,w:AkihabaraGamebox.getScreenW(),h:60,alpha:0.5} } };

	audioserver="resources/audio/"

	AkihabaraGamebox.addBundle({file:"resources/bundle.js"}); // Audio, sprites, fonts etc. are loaded here now. Cleaner code! Btw you can still load resources from the code, like in Capman.

	AkihabaraGamebox.loadAll(go);
}, false);
