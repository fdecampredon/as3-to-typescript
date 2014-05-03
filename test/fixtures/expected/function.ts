module myPackage.test
{

    /*[Meta('dosomething')]*/
    /**
     * hey
     */
    export function hello(param: number): number[] {
        var hey: string = "hello",
            arr: any[] = [1, 2, 3];
        
        arr.push(hey.length);
        return (<number[]>arr);
    }
}