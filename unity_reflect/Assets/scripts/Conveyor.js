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

function OnTriggerEnter(other : Collider) : void
{
    var rb = other.GetComponent(Rigidbody);
    var player = other.GetComponent(PlayerControl);

    if( player == null ) {
        if( rb != null && player == null ) {
            rb.useGravity = false;
        }
    }
    else {
        player.DecUseGravity();
    }

    if( rb != null )
        rb.velocity = Vector3(0,0,0);
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
    var rb = other.GetComponent(Rigidbody);
    var player = other.GetComponent(PlayerControl);

    if( player == null ) {
        if( rb != null )
            rb.useGravity = true;
    }
    else
        player.IncUseGravity();
}

function Update () {

}
