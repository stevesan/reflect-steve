#pragma strict

var input = '';
var code = 'mike';
var head:GameObject;

function Start () {

    head.SetActive(false);
}

private function Unlock()
{
    head.SetActive(true);
}

function Update ()
{
    input += Input.inputString;
    if( input.IndexOf(code) != -1 )
    {
        Unlock();
    }

    if( input.length > code.Length )
    {
        input = input.Substring(input.Length-code.Length, code.Length);
    }
        Debug.Log(input);
}
