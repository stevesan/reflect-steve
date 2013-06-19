#pragma strict
@script RequireComponent( Collider )

var getFx : ParticleSystem;
var getSound : AudioClip;
var lockedSound: AudioClip;

var lockSprite:Renderer;
var starSprite:Renderer;
var game:GameController;

var altTextures:Texture[];

function Start()
{
}

function Update()
{
    if( Input.GetButtonDown("FreeMode") && (Profile.main.HasBeatGame() || Application.isEditor) )
    {
        var levId = GameController.Singleton.GetCurrentLevelId();
        var altId = 0;
        starSprite.material.mainTexture = altTextures[levId % altTextures.length];
    }
}

function SetLocked( locked:boolean )
{
	lockSprite.enabled = locked;
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
