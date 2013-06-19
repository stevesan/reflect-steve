//----------------------------------------
//  The widget that shows how many mirrors you have
// next to the mouse pointer
//----------------------------------------
#pragma strict

var game:GameController;
var text:GUIText;
var textZ = 0.1f;
var icon:GameObject;

var ssTextOffset = Vector2(40, 0);
var ssIconOffset = Vector2(20, 0);

function Start()
{
    GetComponent(PositionAnimation).passive = true;
}

function Update ()
{
    var wsOffset = GetComponent(PositionAnimation).GetCurrentOffset();

	text.transform.position = Camera.main.ScreenToViewportPoint(
			Input.mousePosition + ssTextOffset + wsOffset*50.0 );
    text.transform.position.z = textZ;
	var z = icon.transform.position.z;
	icon.transform.position =
        Camera.main.ScreenToWorldPoint( Input.mousePosition + ssIconOffset )
        + wsOffset;
	icon.transform.position.z = z;
}

function OnCountChanged(count:int)
{
    if( game.IsFreeMode() )
    {
        text.text = ":)";
    }
    else
    {
        text.text = "x" + count;
    }

    icon.SetActive(true);
    GetComponent(PositionAnimation).Play();
}

function OnNotEnoughError()
{
	GetComponent(PositionAnimation).Play();
}

function Hide()
{
    this.text.gameObject.SetActive(false);   
    this.icon.gameObject.SetActive(false);   
}

function Show()
{
    this.text.gameObject.SetActive(true);   
    this.icon.gameObject.SetActive(true);   
}
