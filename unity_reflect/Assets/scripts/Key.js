#pragma strict
@script RequireComponent( RigidbodyNeverSleep )

var doPerFrameSphereCheck = false;	// If true, this will do a per-frame sphere-collision check to check for player-collision
private var disableGravityCount = 0;
var touchLockedAnim:GameObject = null;

var playerCollider:Collider = null;

function Start () {
	if( playerCollider != null )
	{
		// make it NOT collide with the player, so it doesn't affect player's motion
		Physics.IgnoreCollision( GetComponent(Collider), playerCollider );
	}
}

function Update () {
}

function FixedUpdate() {
	if( doPerFrameSphereCheck ) {
		var sc = GetComponent(SphereCollider);
		var bc = GetComponent(BoxCollider);
		if( sc != null ) {
			for( var col in Physics.OverlapSphere( sc.center+transform.position, sc.radius ) ) {
				var player = col.gameObject.GetComponent(PlayerControl);
				if( player != null ) {
                    GetComponent(Connectable).TriggerEvent('OnTouchedPlayer');
				}
			}
		}
        else if( bc != null ) {
            for( var col in Physics.OverlapSphere( bc.center+transform.position, 0.5 ) ) {
                player = col.gameObject.GetComponent(PlayerControl);
                if( player != null ) {
                    GetComponent(Connectable).TriggerEvent('OnTouchedPlayer');
                }
            }
        }
	}
}

function OnCollisionEnter( collision : Collision ) : void
{
	var player = collision.gameObject.GetComponent(PlayerControl);
	if( player != null ) {
        GetComponent(Connectable).TriggerEvent('OnTouchedPlayer');
	}
}

function OnTriggerEnter(other : Collider) : void
{
	var player = other.GetComponent(PlayerControl);
	if( player != null ) {
        GetComponent(Connectable).TriggerEvent('OnTouchedPlayer');
	}
}

function OnEnterConveyor() {
	if( rigidbody ) {
		disableGravityCount++;
		rigidbody.useGravity = disableGravityCount <= 0;
	}
}
function OnExitConveyor() {
	if( rigidbody ) {
		disableGravityCount--;
		rigidbody.useGravity = disableGravityCount <= 0;
	}
}

function OnTouchLockedGoal() {
	if( touchLockedAnim != null ) {
		touchLockedAnim.SendMessage("Play");
	}
}