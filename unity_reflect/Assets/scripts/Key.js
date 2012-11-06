#pragma strict
@script RequireComponent( Collider )

var doPerFrameSphereCheck = false;	// If true, this will do a per-frame sphere-collision check to check for player-collision

function Start () {

}

function Update () {

}

function FixedUpdate() {
	if( doPerFrameSphereCheck ) {
		var sc = GetComponent(SphereCollider);
		if( sc != null ) {
			for( var col in Physics.OverlapSphere( sc.center+transform.position, sc.radius ) ) {
				var player = col.gameObject.GetComponent(PlayerControl);
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
