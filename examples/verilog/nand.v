module visual_circuit(
    input wire input1,
    input wire input2,
    output wire output1
);

    // Internal wires
    wire nand_out1;

    // Logic implementation
    assign nand_out1 = ~(input1 & input2);
    assign output1 = nand_out1;

endmodule
