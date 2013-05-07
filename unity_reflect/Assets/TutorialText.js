#pragma strict

var levelId:int = 0;
var onlyWhenReflecting = false;
var notWhenReflecting = true;
var onlyWhenHasMirrors = false;

function Start ()
{
    var cons = GameController.Singleton.GetComponent(Connectable);
    cons.AddListener(this.gameObject, "OnEnterPlayingState", "OnRelevantStateChanged");
    cons.AddListener(this.gameObject, "OnExitPlayingState", "OnRelevantStateChanged");
    cons.AddListener(this.gameObject, "OnEnterReflectMode", "OnRelevantStateChanged");
    cons.AddListener(this.gameObject, "OnExitReflectMode", "OnRelevantStateChanged");
    cons.AddListener(this.gameObject, "OnGetMirror", "OnRelevantStateChanged");
}

private function OnRelevantStateChanged(gameObj:GameObject)
{
	var game = gameObj.GetComponent(GameController);
	var text = GetComponent(GUIText);

	text.enabled = false;

	if( game.GetState() != "playing" )
		return;

	if( game.GetCurrentLevelId() != levelId )
		return;

	if( onlyWhenReflecting && !game.GetIsReflecting() )
		return;

	if( notWhenReflecting && game.GetIsReflecting() )
		return;

	if( onlyWhenHasMirrors && !game.GetHasMirrors() )
		return;

	text.enabled = true;
}

function Update ()
{
}