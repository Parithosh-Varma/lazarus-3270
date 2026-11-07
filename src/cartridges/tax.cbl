      *> CIVICTAX-78 progressive withholding, four brackets.
      *> Input:  T <gross-cents>
      *> Output: <tax>|<bracket2>|<bracket3>|<bracket4>
       >>SOURCE FORMAT FREE
       IDENTIFICATION DIVISION.
       PROGRAM-ID. CIVICTAX.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-LINE   PIC X(80).
       01  WS-CMD    PIC X(1).
       01  WS-A      PIC X(20).
       01  WS-B      PIC X(20).
       01  WS-N      PIC S9(5) COMP-3.
       01  WS-I      PIC S9(5) COMP-3.
       01  WS-GROSS  PIC S9(13)V99 COMP-3.
       01  WS-SLICE  PIC S9(13)V99 COMP-3.
       01  WS-B2     PIC S9(13)V99 COMP-3.
       01  WS-B3     PIC S9(13)V99 COMP-3.
       01  WS-B4     PIC S9(13)V99 COMP-3.
       01  WS-RATE   PIC S9(5) COMP-3.
       01  WS-TAX    PIC S9(13)V99 COMP-3.
       01  WS-PROD   PIC S9(24)V99 COMP-3.
       01  WS-QUOT   PIC S9(24) COMP-3.
       01  WS-REM    PIC S9(24)V99 COMP-3.
       01  WS-TWICE  PIC S9(24)V99 COMP-3.
       01  WS-MOD    PIC S9(24) COMP-3.
       01  WS-DIV    PIC S9(9) COMP-3.
       01  WS-OUT1   PIC 9(13)V99.
       01  WS-OUT2   PIC 9(13)V99.
       01  WS-OUT3   PIC 9(13)V99.
       01  WS-OUT4   PIC 9(13)V99.

       PROCEDURE DIVISION.
           ACCEPT WS-LINE
           COMPUTE WS-N = FUNCTION NUMVAL(WS-LINE)
           PERFORM VARYING WS-I FROM 1 BY 1 UNTIL WS-I > WS-N
               ACCEPT WS-LINE
               MOVE SPACES TO WS-A WS-B
               UNSTRING WS-LINE DELIMITED BY ALL SPACE INTO WS-CMD WS-A
               PERFORM DO-TAX
           END-PERFORM
           STOP RUN.

       DO-TAX.
           COMPUTE WS-GROSS = FUNCTION NUMVAL(WS-A)
           MOVE 0 TO WS-TAX WS-B2 WS-B3 WS-B4

      *>    bracket 2: (100000, 500000] at 12%
           IF WS-GROSS > 100000
               IF WS-GROSS > 500000
                   MOVE 400000 TO WS-B2
               ELSE
                   COMPUTE WS-B2 = WS-GROSS - 100000
               END-IF
           END-IF
      *>    bracket 3: (500000, 1000000] at 22%
           IF WS-GROSS > 500000
               IF WS-GROSS > 1000000
                   MOVE 500000 TO WS-B3
               ELSE
                   COMPUTE WS-B3 = WS-GROSS - 500000
               END-IF
           END-IF
      *>    bracket 4: above 1000000 at 32%
           IF WS-GROSS > 1000000
               COMPUTE WS-B4 = WS-GROSS - 1000000
           END-IF

           MOVE WS-B2 TO WS-SLICE
           MOVE 12 TO WS-RATE
           PERFORM ADD-BRACKET
           MOVE WS-B3 TO WS-SLICE
           MOVE 22 TO WS-RATE
           PERFORM ADD-BRACKET
           MOVE WS-B4 TO WS-SLICE
           MOVE 32 TO WS-RATE
           PERFORM ADD-BRACKET

           MOVE WS-TAX TO WS-OUT1
           MOVE WS-B2  TO WS-OUT2
           MOVE WS-B3  TO WS-OUT3
           MOVE WS-B4  TO WS-OUT4
           DISPLAY WS-OUT1 "|" WS-OUT2 "|" WS-OUT3 "|" WS-OUT4.

       ADD-BRACKET.
           COMPUTE WS-PROD = WS-SLICE * WS-RATE
           MOVE 100 TO WS-DIV
           PERFORM ROUND-EVEN
           COMPUTE WS-TAX = WS-TAX + WS-QUOT.

       ROUND-EVEN.
           COMPUTE WS-QUOT = WS-PROD / WS-DIV
           COMPUTE WS-REM = WS-PROD - WS-QUOT * WS-DIV
           COMPUTE WS-TWICE = WS-REM * 2
           IF WS-TWICE > WS-DIV
               ADD 1 TO WS-QUOT
           ELSE
               IF WS-TWICE = WS-DIV
                   COMPUTE WS-MOD = FUNCTION MOD(WS-QUOT, 2)
                   IF WS-MOD NOT = 0
                       ADD 1 TO WS-QUOT
                   END-IF
               END-IF
           END-IF.
