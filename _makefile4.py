content = '''
if __name__ == "__main__":
    result = main()
    print()
    print("="*60)
    if result:
        print("  WORKFLOW COMPLET REUSSI !")
    else:
        print("  WORKFLOW INCOMPLET")
    print("="*60)
'''
with open("test-uc-full-auto.py", "a", encoding="utf-8") as f:
    f.write(content)
print("Part 4 done")
