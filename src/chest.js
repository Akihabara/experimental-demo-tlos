var Chest = function(x,y,id,animated,cont,contid,expi,td){
	return({
		group:"walls",
		tileset:"chest",
		zindex:0, // Needed for zindexed objects
		x:x*td.tilew,
		y:y*td.tileh,
		questid:id,
		accz:(animated?-10:0), // Bounces
		content:cont,
		contentid:contid,
		expire:expi,

		initialize:function() {
			AkihabaraTopview.initialize(this,{
				shadow:{tileset:"shadows",tile:0},
				frames:{
					standdown:{ speed:1, frames:[0] }
				}
			});
		},

		doPlayerAction:function(by) { // When used
			if (this.questid!=null) tilemaps.queststatus[this.questid]=true;
			AkihabaraAudio.hitAudio("explosion");
			maingame.addSmoke(this); // Add a smoke spit
			maingame.addBonus(this.x,this.y,this.content,this.contentid,this.expire); // Generate the content bonus
			AkihabaraGamebox.trashObject(this); // and disappear
		},

		first:function() {
			AkihabaraTopview.handleGravity(this); // z-gravity
			AkihabaraTopview.applyGravity(this); // z-gravity
			AkihabaraTopview.floorCollision(this,{bounce:2,audiobounce:"beep"}); // Collision with the floor (for z-gravity)
			AkihabaraTopview.adjustZindex(this); // Set the right zindex
		},
		blit:function() {
			if (AkihabaraGamebox.objectIsVisible(this)) {
				// Shadowed object. First draws the shadow...
				AkihabaraGamebox.blitTile(AkihabaraGamebox.getBufferContext(),{tileset:this.shadow.tileset,tile:this.shadow.tile,dx:this.x,dy:this.y+this.h-AkihabaraGamebox.getTiles(this.shadow.tileset).tileh+4,camera:this.camera});
				// Then the object. Notes that the y is y-z to have the "over the floor" effect.
				AkihabaraGamebox.blitTile(AkihabaraGamebox.getBufferContext(),{tileset:this.tileset,tile:this.frame,dx:this.x,dy:this.y+this.z,camera:this.camera,fliph:this.fliph,flipv:this.flipv});
			}
		}
	});
}
