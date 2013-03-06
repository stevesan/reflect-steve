//----------------------------------------
//  The widget that shows how many mirrors you have
// next to the mouse pointer
//----------------------------------------
#pragma strict

var text:GUIText;
var icon:GameObject;

var ssTextOffset = Vector2(40, 0);
var ssIconOffset = Vector2(20, 0);

function Start () {

}

function Update ()
{
	text.gameObject.transform.position = Camera.main.ScreenToViewportPoint(
			Input.mousePosition + ssTextOffset );
	var z = icon.transform.position.z;
	icon.transform.position = Camera.main.ScreenToWorldPoint(
			Input.mousePosition + ssIconOffset );
	icon.transform.position.z = z;
}

function OnCountChanged(count:int)
{
	text.text = "x" + count;
	icon.SetActive(true);

	GetComponent(PositionAnimation).Play();
}

function OnNotEnoughError()
{
	GetComponent(PositionAnimation).Play();
}