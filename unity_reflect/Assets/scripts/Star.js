#pragma strict
@script RequireComponent( Collider )

var getFx : ParticleSystem;
var getSound : AudioClip;
var lockedSound: AudioClip;

var lockSprite:Renderer;
var starSprite:Renderer;
var game:GameController;

var altTextures:Texture[];
var altScales:float[];

private var origTexture:Texture;

function Start()
{
    origTexture = null;
}

function Update()
{
    if( Input.GetButtonDown("FreeMode") && (Profile.main.HasBeatGame() || Application.isEditor) )
    {
        if( origTexture == null )
        {
            Utils.Assert( altTextures.length == altScales.length );
            origTexture = starSprite.material.mainTexture;
            var levId = GameController.Singleton.GetCurrentLevelId();
            var altId = levId % altTextures.length;
            starSprite.material.mainTexture = altTextures[altId];
            var s = altScales[altId];
            starSprite.transform.localScale = Vector3( s, s, 1 );
        }
        else
        {
            starSprite.material.mainTexture = origTexture;
            origTexture = null;
            starSprite.transform.localScale = Vector3( 1, 1, 1 );
        }
    }
}

function SetLocked( locked:boolean )
{
	lockSprite.enabled = locked;
    starSprite.enabled = !locked;
}

function OnUnlockedGoalByKey()
{
	starSprite.SendMessage("Play");
}

function OnTriggerEnter(other : Collider) : void
{
	var player = other.GetComponent(PlayerControl);
	if( player != null )
	{
        game.OnTouchCarrot(this);

        if( !game.GetAllKeysGot() )
        {
            AudioSource.PlayClipAtPoint( lockedSound, Camera.main.transform.position );
        }
        else
        {
            AudioSource.PlayClipAtPoint( getSound, Camera.main.transform.position );
			getFx.transform.position = transform.position;
			getFx.Play();
            Destroy(this.gameObject);
        }
	}
}

function OnDestroy()
{
    DestroyImmediate(starSprite.renderer.material);
}
