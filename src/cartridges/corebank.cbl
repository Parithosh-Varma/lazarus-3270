      *> COREBANK — the 1978 money path, actually in COBOL.
      *> Money is integer cents in COMP-3. No floating point anywhere.
      *>
      *> Protocol (stdin):
      *>   line 1: record count N
      *>   then N lines:
      *>     W <balance-cents> <amount-cents>      wire transfer
      *>     I <principal-cents> <rate-bps> <days> daily compounding
      *>
      *> Output, one line per record, digits only (implied decimal point):
      *>   W -> <15-digit new balance>|<status>
      *>   I -> <15-digit interest cents>
      *>
      *> The V99 in every PIC is digit padding, not a fraction: a field
      *> holding 11003.63 means 1100363 cents. Arithmetic stays exact.
       >>SOURCE FORMAT FREE
       IDENTIFICATION DIVISION.
       PROGRAM-ID. COREBANK.
       ENVIRONMENT DIVISION.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-LINE        PIC X(80).
       01  WS-CMD         PIC X(1).
       01  WS-A           PIC X(20).
       01  WS-B           PIC X(20).
       01  WS-C           PIC X(20).
       01  WS-COUNT       PIC S9(5)   COMP-3.
       01  WS-IX          PIC S9(5)   COMP-3.
       01  WS-ID          PIC S9(5)   COMP-3.

       01  WS-BALANCE     PIC S9(13)V99 COMP-3.
       01  WS-AMOUNT      PIC S9(13)V99 COMP-3.
       01  WS-OLD         PIC S9(13)V99 COMP-3.
       01  WS-FEE         PIC S9(5)V99  COMP-3 VALUE 150.
       01  WS-STATUS      PIC X(10).
       01  WS-OUT         PIC 9(13)V99.

       01  WS-PRINCIPAL   PIC S9(13)V99 COMP-3.
       01  WS-P           PIC S9(13)V99 COMP-3.
       01  WS-RATE        PIC S9(9)     COMP-3.
       01  WS-DAYS        PIC S9(5)     COMP-3.
       01  WS-DAILY       PIC S9(9)     COMP-3.
       01  WS-NUM         PIC S9(9)     COMP-3.
       01  WS-PROD        PIC S9(24)V99 COMP-3.
       01  WS-QUOT        PIC S9(24)    COMP-3.
       01  WS-REM         PIC S9(24)V99 COMP-3.
       01  WS-TWICE       PIC S9(24)V99 COMP-3.
       01  WS-MOD         PIC S9(24)    COMP-3.
       01  WS-INTEREST    PIC S9(13)V99 COMP-3.

       PROCEDURE DIVISION.
           ACCEPT WS-LINE
           COMPUTE WS-COUNT = FUNCTION NUMVAL(WS-LINE)
           PERFORM VARYING WS-IX FROM 1 BY 1 UNTIL WS-IX > WS-COUNT
               ACCEPT WS-LINE
               UNSTRING WS-LINE DELIMITED BY ALL SPACE
                   INTO WS-CMD WS-A WS-B WS-C
               EVALUATE WS-CMD
                   WHEN "W"
                       PERFORM DO-WIRE
                   WHEN "I"
                       PERFORM DO-INTEREST
                   WHEN OTHER
                       DISPLAY "BAD"
               END-EVALUATE
           END-PERFORM
           STOP RUN.

      *> Fee is debited, then the overdraft guard restores the old
      *> balance. A COMPUTE overflow is the 1978 SIZE ERROR path and
      *> leaves the receiver untouched, which is exactly what we want.
       DO-WIRE.
           COMPUTE WS-BALANCE = FUNCTION NUMVAL(WS-A)
           COMPUTE WS-AMOUNT  = FUNCTION NUMVAL(WS-B)
           MOVE WS-BALANCE TO WS-OLD
           MOVE "OK" TO WS-STATUS
           COMPUTE WS-BALANCE = WS-BALANCE + WS-AMOUNT - WS-FEE
               ON SIZE ERROR MOVE "SIZE_ERROR" TO WS-STATUS
           END-COMPUTE
           IF WS-STATUS = "OK"
               IF WS-BALANCE < 0
                   MOVE WS-OLD TO WS-BALANCE
                   MOVE "OVERDRAFT" TO WS-STATUS
               END-IF
           END-IF
           MOVE WS-BALANCE TO WS-OUT
           DISPLAY WS-OUT "|" FUNCTION TRIM(WS-STATUS).

      *> Daily rate = round(bps * 100 / 365). Integer bps can never
      *> land exactly on .5, so the +365/730 form is exact half-up.
      *> Each day: p = p * (1000000 + daily) / 1000000, rounded
      *> half-to-even, implemented by hand because 1978 COBOL only
      *> had ROUNDED (half-away-from-zero).
       DO-INTEREST.
           COMPUTE WS-PRINCIPAL = FUNCTION NUMVAL(WS-A)
           COMPUTE WS-RATE      = FUNCTION NUMVAL(WS-B)
           COMPUTE WS-DAYS      = FUNCTION NUMVAL(WS-C)
           COMPUTE WS-DAILY = (WS-RATE * 200 + 365) / 730
           COMPUTE WS-NUM = 1000000 + WS-DAILY
           MOVE WS-PRINCIPAL TO WS-P
           PERFORM VARYING WS-ID FROM 1 BY 1 UNTIL WS-ID > WS-DAYS
               COMPUTE WS-PROD = WS-P * WS-NUM
               COMPUTE WS-QUOT = WS-PROD / 1000000
               COMPUTE WS-REM  = WS-PROD - WS-QUOT * 1000000
               COMPUTE WS-TWICE = WS-REM * 2
               IF WS-TWICE > 1000000
                   ADD 1 TO WS-QUOT
               ELSE
                   IF WS-TWICE = 1000000
                       COMPUTE WS-MOD = FUNCTION MOD(WS-QUOT, 2)
                       IF WS-MOD NOT = 0
                           ADD 1 TO WS-QUOT
                       END-IF
                   END-IF
               END-IF
               MOVE WS-QUOT TO WS-P
           END-PERFORM
           COMPUTE WS-INTEREST = WS-P - WS-PRINCIPAL
           MOVE WS-INTEREST TO WS-OUT
           DISPLAY WS-OUT.
