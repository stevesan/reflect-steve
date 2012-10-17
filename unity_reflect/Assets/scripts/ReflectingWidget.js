#pragma strict

var game : GameController;
var gfx : GameObject;
private var state = "hidden";

function Awake()
{
	gfx.GetComponent(Renderer).enabled = false;
}

function OnEnterReflectMode(game:GameController)
{
	state = "shown";
	gfx.GetComponent(Renderer).enabled = true;
	gfx.GetComponent(FadeAnim).FadeIn();
}

function OnExitReflectMode(game:GameController)
{
	state = "hidden";
	gfx.GetComponent(FadeAnim).FadeOut();
}

function Update()
{
	if( state == "shown" ) {
		var z = transform.position.z;
		transform.position = game.GetMirrorPos();
		transform.position.z = z;
		transform.eulerAngles.z = Mathf.Rad2Deg * game.GetMirrorAngle();
	}
}
