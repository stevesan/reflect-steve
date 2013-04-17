#pragma strict
@script RequireComponent( Collider )

var getFx : ParticleSystem;
var getSound : AudioClip;
var lockedSound: AudioClip;

var lockSprite:Renderer;
var starSprite:Renderer;
var game:GameController;

function Start () {

}

function Update () {

}

function SetShown( shown:boolean ) {
	starSprite.enabled = shown;
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
