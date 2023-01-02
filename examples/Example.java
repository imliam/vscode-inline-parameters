package examples;


public class Example {
    public static void test(String a, String b, int... c) {
    }

    public static void main(String[] args) {
        test("Foo", "bar", 1, 2, 3, 4);

        String message = new String(new char[]{'5', '4', '3'});

        System.out.println(message);
    }
}