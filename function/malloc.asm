;R1 ������� �����
;R2 ���������� ������������� ������
;R3 ���������� �� ���������� ���������
;R4 0x8000 ��� ���������
;R5 �����
;R6 ������� ���������� �����
_malloc: 
 LDI R2,(2 + R0) ;������� ������ ����������
 CMP R2,0
 JZ end_malloc
 MOV R5,R2
 LDC R4,1
 AND R5,R4
 CMP R5,1
 JNZ next_malloc
 INC R2
next_malloc:
 INC R2,2
 LDI R1,#END ;��������� �����
 LDI R4,32768 ;0x8000
next_byte:
 LDI R3,(R1);��������� �� ���������� ����
 CMP R3,R4
 JNP malloc1;���� ����
 SUB R3,R4
 ADD R1,R3;�������� ����� ���������
 CMP R1,R0;���������, �� �������� �� �� �� ����
 JP end_malloc
 JMP next_byte
malloc1:
 CMP R3,0 ;���� ���� ����������
 JNZ malloc2
 MOV R5,R2
 ADD R5,R1
 CMP R5,R0;���������, �� �������� �� ����� ����� �� ����
 JP end_malloc
 ADD R2,R4
 STI (R1),R2
 INC R1,2
 RET
malloc2:
 MOV R6,R3
 SUB R6,R2
 JNP next_byte1 ;������ �� �������
 CMP R6,1
; JNZ next_malloc2
; INC R2
; INC R6
;next_malloc2:
 MOV R5,R2
 ADD R5,R1
 CMP R5,R0;���������, �� �������� �� ����� ����� �� ����
 JP end_malloc
 ADD R2,R4
 STI (R1),R2
 INC R1,2
 CMP R6,0
 JZ ret_malloc
 STI (R5),R6
 RET
next_byte1:
 ADD R1,R3
 JMP next_byte
end_malloc:
 LDC R1,0
 RET
ret_malloc:
 RET
 
 
;R1 ������� �����
;R2 ���������� �� ���������� �����
;R3 ����������
;R4 �������� ���������� �����
_free:
 LDI R1,(2 + R0)
 DEC R1,2
 LDI R3,32768
 LDI R2,(R1)
 SUB R2,R3
 LDI R4,(R1+R2)
 CMP R4,0
 JZ end_free_0
 CMP R3,R4
 JP next_free
 STI (R1),R2
 RET 
 
end_free_0:
 LDI R2,0
 STI (R1),R2
 RET
 
next_free:
 ADD R2,R4
 LDI R4,(R1+R2)
 CMP R4,0
 JZ end_free_0
 CMP R3,R4
 JP next_free
 STI (R1),R2
 RET