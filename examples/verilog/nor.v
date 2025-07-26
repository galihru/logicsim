module visual_circuit(
    input wire input1,
    input wire input2,
    output wire output1
);

    // Internal wires
    wire nor_out1;

    // Logic implementation
    assign nor_out1 = ~(input1 | input2);
    assign output1 = nor_out1;

endmodule
