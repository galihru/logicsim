module visual_circuit(
    input wire input1,
    input wire input2,
    output wire output1
);

    // Internal wires
    wire xor_out1;

    // Logic implementation
    assign xor_out1 = input1 ^ input2;
    assign output1 = xor_out1;

endmodule
