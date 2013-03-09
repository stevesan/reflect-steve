#pragma strict
@script RequireComponent(Collider)

var receiver:GameObject = null;	// sent OnGetMirror events

var onGetSound:AudioClip = null;
var flySecs:float = 0.5;
var flyTarget:Transform;
var mainCam:Camera;
var tracker : Tracking = null;

private var state = "active";
private var flyStartTime:float;
private var flyStartPos:Vector2;

function Start () {

}

function Update () {

	if( state == "flying" )
	{
		var t = (Time.time-flyStartTime) / flySecs;

		if( t < 1.0 )
			transform.position = Vector2.Lerp( flyStartPos, flyTarget.position, Mathf.Pow(t,2.0) );
		else {
			transform.position = flyTarget.position;
			receiver.SendMessage("OnGetMirror", this.GetComponent(Mirror) );
			Destroy(this.gameObject);
		}
	}
}

function OnTriggerEnter(other : Collider) : void
{
	if( state == "active" )
	{
		var player = other.GetComponent(PlayerControl);

		if( player != null )
		{
			AudioSource.PlayClipAtPoint( onGetSound, transform.position );
			state = "flying";
			flyStartTime = Time.time;
			flyStartPos = transform.position;
			
			if( tracker != null )
			{
				var json = new ToStringJsonWriter();
				json.WriteObjectStart();
				json.Write("mirrorPos", Utils.ToVector2(transform.position));
				json.WriteObjectEnd();
				tracker.PostEvent( "gotMirror", json.GetString() );
			}
		}
	}
}