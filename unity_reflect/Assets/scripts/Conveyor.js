#pragma strict

private var pushDir:Vector2;

private var paraSpeed = 2.0;
private var perpSpeed = 1.0;

function Start () {

}

function Initialize( p1:Vector2, p2:Vector2, radius:float ) : void
{
    var cap:CapsuleCollider = gameObject.AddComponent(CapsuleCollider);
    cap.center = Vector3(0,0,0);
    cap.radius = radius;
    var delta = p2-p1;
    var length = delta.magnitude;
    var angle = 0.0;
    if( Mathf.Abs(delta.x) < 1e-8 ) angle = Mathf.PI/2;
    else if( Mathf.Abs(delta.y) < 1e-8 ) angle = 0.0;
    else angle = Mathf.Atan2( delta.y, delta.x );
    cap.height = length + 2*radius;
    // We add pi/2 since the capsule starts vertical
    transform.eulerAngles.z = (angle+Mathf.PI/2.0) * Mathf.Rad2Deg;
    transform.position = (p1+p2)/2.0;
    cap.isTrigger = true;

    pushDir = delta/length;
}

private var touchingObjects = new HashSet.<GameObject>();

function OnTriggerEnter(other : Collider) : void
{
	other.SendMessage("OnEnterConveyor", this, SendMessageOptions.DontRequireReceiver);
	touchingObjects.Add( other.gameObject );
	Debug.Log("touched "+other.gameObject.name);
}

function OnTriggerStay(other : Collider) : void
{
    var rb = other.GetComponent(Rigidbody);
    if( rb != null ) {
        // move this body in the push dir, but also bringing it toward's the line's center
        var otherToCenter = transform.position - other.transform.position;
        var perp = Math2D.PerpCCW( pushDir );
        var dotp = Vector2.Dot( perp, otherToCenter );
        var otherToLine = perp * dotp;
        rb.velocity = pushDir*paraSpeed + otherToLine*perpSpeed;
    }
}

function OnTriggerExit(other : Collider) : void
{
	other.SendMessage("OnExitConveyor", this, SendMessageOptions.DontRequireReceiver);
	if( touchingObjects.Contains( other.gameObject ) )
		touchingObjects.Remove( other.gameObject );
}

function OnDestroy()
{
	Debug.Log("called");
	for( go in touchingObjects )
		if( go != null ) {
		go.SendMessage("OnExitConveyor", this, SendMessageOptions.DontRequireReceiver);
		}
}

function Update () {

}
