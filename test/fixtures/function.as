package myPackage.test
{

    [Meta('dosomething')]
    /**
     * hey
     */
    public function hello(param: int): Vector.<int> {
        var hey: String = "hello",
            arr: Array = [1, 2, 3];
        
        arr.push(hey.length);
        return Vector.<int>(arr);
    }
}