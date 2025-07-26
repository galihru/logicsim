module visual_circuit(
    input wire input1,
    output wire output1
);

    // Internal wires
    wire not_out1;

    // Logic implementation
    assign not_out1 = ~input1;
    assign output1 = not_out1;

endmodule
